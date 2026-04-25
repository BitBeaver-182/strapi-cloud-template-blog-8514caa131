/**
 * supplier-order service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { ensureRowDocumentId } from '../../../utils/ensure-document-id';

const SUPPLIER_ORDER_UID = 'api::supplier-order.supplier-order';
const QUOTE_UID = 'api::quote.quote';
const SUPPLIER_UID = 'api::supplier.supplier';
const INVOICE_SERVICE_UID = 'api::supplier-invoice.supplier-invoice';

type RelationRef = number | string | null;
type Money = { amount: number; currency_code: string };

function extractRelationRef(value: any): RelationRef {
  if (value == null) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value !== 'object') return null;
  if (value.documentId != null) return String(value.documentId);
  if (value.id != null) return Number(value.id);

  for (const key of ['connect', 'set']) {
    const relationList = value[key];
    if (Array.isArray(relationList) && relationList.length > 0) {
      return extractRelationRef(relationList[0]);
    }
  }

  return null;
}

function connectDocument(documentId: string) {
  return { connect: [documentId] };
}

function roundMoney(value: unknown) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return 0;
  }
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalizeMoney(m: any): Money | null {
  if (m == null) {
    return null;
  }
  const code = m.currency_code;
  if (code == null || String(code).trim() === '' || String(code).length < 3) {
    return null;
  }
  return {
    amount: roundMoney(m.amount),
    currency_code: String(code).toUpperCase().slice(0, 3),
  };
}

function zeroMoney(currencyCode: string): Money {
  return { amount: 0, currency_code: currencyCode };
}

function extractUploadFileId(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const media = value as Record<string, unknown>;
    if (media['id'] != null) {
      return extractUploadFileId(media['id']);
    }
  }
  return null;
}

function toIsoDateStart(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const dateOnly = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return `${dateOnly}T00:00:00.000Z`;
  }
  const parsed = new Date(dateOnly);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

async function findQuoteWithSupplier(strapi: any, quoteValue: any) {
  const ref = extractRelationRef(quoteValue);
  if (ref == null || ref === '') {
    throw new errors.ValidationError('A quote is required to create a supplier order.');
  }

  if (typeof ref === 'number' || (typeof ref === 'string' && /^\d+$/.test(String(ref)))) {
    return strapi.db.query(QUOTE_UID).findOne({
      where: { id: Number(ref) },
      populate: ['supplier', 'pdf', 'total'],
    });
  }

  return strapi.documents(QUOTE_UID).findOne({
    documentId: String(ref),
    populate: ['supplier', 'pdf', 'total'],
  });
}

function assertValidTrackingUrl(value: unknown) {
  if (value == null || value === '') {
    return;
  }
  const s = String(value).trim();
  if (!s) {
    return;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new errors.ValidationError('Tracking URL must be http or https.');
    }
  } catch (e) {
    if (e instanceof errors.ValidationError) {
      throw e;
    }
    throw new errors.ValidationError('Tracking URL must be a valid URL.');
  }
}

async function resolveSupplierConnectRef(strapi: any, quote: any) {
  if (!quote) {
    throw new errors.ValidationError('Quote not found.');
  }
  if (!quote.supplier) {
    throw new errors.ValidationError('This quote does not have a supplier.');
  }
  const id = await ensureRowDocumentId(strapi, SUPPLIER_UID, quote.supplier);
  if (!id) {
    throw new errors.ValidationError('This quote does not have a supplier.');
  }
  return id;
}

async function createInvoiceFromQuoteIfComplete(strapi: any, order: any, quote: any) {
  const attachment = extractUploadFileId(quote?.pdf);
  const total = normalizeMoney(quote?.total);
  const expirationDate = toIsoDateStart(quote?.expiration_date);
  const vendorName =
    typeof quote?.supplier?.name === 'string' && quote.supplier.name.trim() !== ''
      ? quote.supplier.name.trim()
      : null;

  if (!attachment || !total || !expirationDate || !vendorName) {
    return;
  }

  await (strapi.service(INVOICE_SERVICE_UID) as any).createWithTotals({
    supplierOrder: connectDocument(order.documentId),
    vendorName,
    total,
    amountPaid: zeroMoney(total.currency_code),
    amountRemaining: { ...total },
    expirationDate,
    attachment,
  });
}

export default factories.createCoreService(SUPPLIER_ORDER_UID, ({ strapi }) => ({
  async createWithInferredSupplier(data: any) {
    const quote = await findQuoteWithSupplier(strapi, data?.quote);
    assertValidTrackingUrl(data?.trackingUrl);

    const quoteDocumentId = await ensureRowDocumentId(strapi, QUOTE_UID, quote);
    if (!quoteDocumentId) {
      throw new errors.ValidationError('Quote not found.');
    }
    const supplierConnect = await resolveSupplierConnectRef(strapi, quote);

    const order = await (strapi as any).documents(SUPPLIER_ORDER_UID).create({
      data: {
        ...data,
        quote: connectDocument(quoteDocumentId),
        supplier: connectDocument(supplierConnect),
      },
      populate: ['quote', 'supplier'],
    });

    await createInvoiceFromQuoteIfComplete(strapi, order, quote);

    await (strapi.service(
      'api::supplier-order-history-entry.supplier-order-history-entry',
    ) as any).record({
      supplierOrderDocumentId: order.documentId,
      message: 'Order created',
      at: order.createdAt,
    });

    return order;
  },

  async updateWithHistory(documentId: string, data: any) {
    if (Object.prototype.hasOwnProperty.call(data, 'trackingUrl')) {
      assertValidTrackingUrl(data.trackingUrl);
    }

    const existing = await (strapi as any).documents(SUPPLIER_ORDER_UID).findOne({
      documentId,
      populate: ['quote', 'supplier'],
    });

    if (!existing) {
      throw new errors.NotFoundError('Supplier order not found.');
    }

    const nextData = { ...data };
    delete nextData.supplier;

    if (Object.prototype.hasOwnProperty.call(nextData, 'quote')) {
      const quote = await findQuoteWithSupplier(strapi, nextData.quote);
      const quoteDocumentId = await ensureRowDocumentId(strapi, QUOTE_UID, quote);
      if (!quoteDocumentId) {
        throw new errors.ValidationError('Quote not found.');
      }
      const supplierConnect = await resolveSupplierConnectRef(strapi, quote);
      nextData.quote = connectDocument(quoteDocumentId);
      nextData.supplier = connectDocument(supplierConnect);
    }

    const updated = await (strapi as any).documents(SUPPLIER_ORDER_UID).update({
      documentId,
      data: nextData,
      populate: ['quote', 'supplier'],
    });

    const history = strapi.service(
      'api::supplier-order-history-entry.supplier-order-history-entry',
    ) as any;

    if (
      Object.prototype.hasOwnProperty.call(data, 'orderStatus') &&
      data.orderStatus !== existing.orderStatus
    ) {
      await history.record({
        supplierOrderDocumentId: updated.documentId,
        message: `Status changed from ${existing.orderStatus} to ${data.orderStatus}`,
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(data, 'trackingUrl') &&
      (data.trackingUrl || '') !== (existing.trackingUrl || '')
    ) {
      await history.record({
        supplierOrderDocumentId: updated.documentId,
        message: 'Tracking URL updated',
      });
    }

    return updated;
  },
}));

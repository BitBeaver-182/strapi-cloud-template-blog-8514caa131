/**
 * supplier-order service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { ensureRowDocumentId } from '../../../utils/ensure-document-id';

const SUPPLIER_ORDER_UID = 'api::supplier-order.supplier-order';
const QUOTE_UID = 'api::quote.quote';
const SUPPLIER_UID = 'api::supplier.supplier';

type RelationRef = number | string | null;

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

async function findQuoteWithSupplier(strapi: any, quoteValue: any) {
  const ref = extractRelationRef(quoteValue);
  if (ref == null || ref === '') {
    throw new errors.ValidationError('A quote is required to create a supplier order.');
  }

  if (typeof ref === 'number' || (typeof ref === 'string' && /^\d+$/.test(String(ref)))) {
    return strapi.db.query(QUOTE_UID).findOne({
      where: { id: Number(ref) },
      populate: ['supplier'],
    });
  }

  return strapi.documents(QUOTE_UID).findOne({
    documentId: String(ref),
    populate: ['supplier'],
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

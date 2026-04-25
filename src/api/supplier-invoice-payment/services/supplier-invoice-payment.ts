/**
 * supplier-invoice-payment service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { ensureRowDocumentId } from '../../../utils/ensure-document-id';

const PAYMENT_UID = 'api::supplier-invoice-payment.supplier-invoice-payment';
const INVOICE_UID = 'api::supplier-invoice.supplier-invoice';
const SUPPLIER_ORDER_UID = 'api::supplier-order.supplier-order';

type Money = { amount: number; currency_code: string };

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

function extractRelationRef(value: any): string | number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (typeof value !== 'object') {
    return null;
  }
  if (value.documentId != null) {
    return String(value.documentId);
  }
  if (value.id != null) {
    return Number(value.id);
  }

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

function formatAmount(value: unknown) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return '$0';
  }
  return `$${n.toLocaleString('en-US')}`;
}

async function findInvoiceDocument(
  strapi: any,
  invoiceValue: any,
): Promise<{
  id?: number;
  documentId: string;
  supplierOrder: any;
  total: any;
  invoiceNumber?: string;
} | null> {
  const ref = extractRelationRef(invoiceValue);
  if (ref == null || ref === '') {
    throw new errors.ValidationError('An invoice is required.');
  }

  if (typeof ref === 'number' || (typeof ref === 'string' && /^\d+$/.test(String(ref)))) {
    const row = await strapi.db.query(INVOICE_UID).findOne({
      where: { id: Number(ref) },
    });
    const did = await ensureRowDocumentId(strapi, INVOICE_UID, row);
    if (!did) {
      return null;
    }
    return (strapi as any).documents(INVOICE_UID).findOne({
      documentId: did,
      populate: { supplierOrder: true, total: true },
    });
  }

  return (strapi as any).documents(INVOICE_UID).findOne({
    documentId: String(ref),
    populate: { supplierOrder: true, total: true },
  });
}

function mergePaymentAmountWithInvoice(
  data: any,
  invoice: { total: any },
): Money {
  const inv = normalizeMoney(invoice.total);
  if (!inv) {
    throw new errors.ValidationError('Invoice total (money) is required.');
  }

  const raw = data?.paymentAmount ?? data?.amount;
  const p = { ...raw };
  if (p?.currency_code == null || String(p.currency_code).length < 3) {
    p.currency_code = inv.currency_code;
  }
  const out = normalizeMoney(p);
  if (!out) {
    throw new errors.ValidationError('A valid payment amount (shared.money) is required.');
  }
  if (out.currency_code !== inv.currency_code) {
    throw new errors.ValidationError('Payment currency must match the invoice total currency.');
  }
  return out;
}

async function normalizeInvoiceForHistory(strapi: any, invoice: any) {
  if (!invoice) {
    return null;
  }
  const invoiceDocumentId = await ensureRowDocumentId(strapi, INVOICE_UID, invoice);
  const soRow = invoice.supplierOrder;
  const supplierOrderDocumentId = soRow
    ? await ensureRowDocumentId(strapi, SUPPLIER_ORDER_UID, soRow)
    : null;
  if (!invoiceDocumentId || !supplierOrderDocumentId) {
    return null;
  }
  return {
    documentId: invoiceDocumentId,
    invoiceNumber: invoice.invoiceNumber,
    supplierOrder: { documentId: supplierOrderDocumentId },
  };
}

async function findPayment(strapi: any, documentId: string) {
  return strapi.documents(PAYMENT_UID).findOne({
    documentId,
    populate: {
      invoice: {
        populate: { supplierOrder: true, total: true },
      },
    },
  });
}

async function refreshInvoiceTotals(strapi: any, invoiceDocumentId: string) {
  return (strapi.service('api::supplier-invoice.supplier-invoice') as any).refreshPaymentTotals(
    invoiceDocumentId,
  );
}

async function recordHistory(strapi: any, supplierOrderDocumentId: string, message: string) {
  await strapi.service('api::supplier-order-history-entry.supplier-order-history-entry').record({
    supplierOrderDocumentId,
    message,
  });
}

export default factories.createCoreService(PAYMENT_UID, ({ strapi }) => ({
  async createWithInvoiceTotals(data: any) {
    const invoice = await findInvoiceDocument(strapi, data?.invoice);
    if (!invoice) {
      throw new errors.ValidationError('Invoice not found.');
    }
    const normalized = await normalizeInvoiceForHistory(strapi, invoice);
    if (!normalized) {
      throw new errors.ValidationError('Invoice not found.');
    }

    const paymentAmount = mergePaymentAmountWithInvoice(data, invoice);

    const { invoice: _inv, paymentAmount: _pa, amount, ...rest } = data;

    const payment = await (strapi as any).documents(PAYMENT_UID).create({
      data: {
        ...rest,
        invoice: connectDocument(normalized.documentId),
        paymentAmount,
      },
      populate: {
        invoice: {
          populate: ['supplierOrder', 'total'],
        },
        paymentAmount: true,
      },
    });

    await refreshInvoiceTotals(strapi, normalized.documentId);
    await recordHistory(
      strapi,
      normalized.supplierOrder.documentId,
      `Payment of ${formatAmount(
        roundMoney(payment?.paymentAmount?.amount ?? 0),
      )} recorded for ${normalized.invoiceNumber}`,
    );

    return payment;
  },

  async updateWithInvoiceTotals(documentId: string, data: any) {
    const existing = await findPayment(strapi, documentId);
    const inv = existing?.invoice;
    const normalized = await normalizeInvoiceForHistory(strapi, {
      ...inv,
      supplierOrder: inv?.supplierOrder,
    });
    if (!existing || !inv || !normalized) {
      throw new errors.NotFoundError('Supplier invoice payment not found.');
    }

    const nextData = { ...data };
    delete nextData.invoice;
    if (
      Object.prototype.hasOwnProperty.call(data, 'paymentAmount') ||
      Object.prototype.hasOwnProperty.call(data, 'amount')
    ) {
      (nextData as any).paymentAmount = mergePaymentAmountWithInvoice(data, inv);
    }
    delete (nextData as any).amount;

    const payment = await (strapi as any).documents(PAYMENT_UID).update({
      documentId,
      data: nextData,
      populate: {
        invoice: {
          populate: ['supplierOrder', 'total'],
        },
        paymentAmount: true,
      },
    });

    await refreshInvoiceTotals(strapi, normalized.documentId);
    await recordHistory(
      strapi,
      normalized.supplierOrder.documentId,
      `Payment updated for ${inv.invoiceNumber}`,
    );

    return payment;
  },

  async deleteWithInvoiceTotals(documentId: string) {
    const existing = await findPayment(strapi, documentId);
    const inv = existing?.invoice;
    const normalized = await normalizeInvoiceForHistory(strapi, {
      ...inv,
      supplierOrder: inv?.supplierOrder,
    });
    if (!existing || !inv || !normalized) {
      throw new errors.NotFoundError('Supplier invoice payment not found.');
    }

    const deleted = await (strapi as any).documents(PAYMENT_UID).delete({ documentId });

    await refreshInvoiceTotals(strapi, normalized.documentId);
    await recordHistory(
      strapi,
      normalized.supplierOrder.documentId,
      `Payment removed from ${inv.invoiceNumber}`,
    );

    return deleted;
  },
}));

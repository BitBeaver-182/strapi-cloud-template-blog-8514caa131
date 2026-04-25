/**
 * supplier-invoice service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { ensureRowDocumentId } from '../../../utils/ensure-document-id';

const INVOICE_UID = 'api::supplier-invoice.supplier-invoice';
const SUPPLIER_ORDER_UID = 'api::supplier-order.supplier-order';

function roundMoney(value: unknown) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function extractRelationRef(value: any): string | number | null {
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

function calculateRemaining(totalAmount: unknown, amountPaid: unknown) {
  return Math.max(0, roundMoney(Number(totalAmount || 0) - Number(amountPaid || 0)));
}

function createInvoiceNumber() {
  return `SI-${Date.now().toString(36).toUpperCase()}`;
}

async function findSupplierOrder(strapi: any, supplierOrderValue: any) {
  const ref = extractRelationRef(supplierOrderValue);
  if (ref == null || ref === '') {
    throw new errors.ValidationError('A supplier order is required.');
  }

  if (typeof ref === 'number' || (typeof ref === 'string' && /^\d+$/.test(String(ref)))) {
    return strapi.db.query(SUPPLIER_ORDER_UID).findOne({
      where: { id: Number(ref) },
    });
  }

  return strapi.documents(SUPPLIER_ORDER_UID).findOne({
    documentId: String(ref),
  });
}

async function withSupplierOrderDocumentId(strapi: any, order: any) {
  if (!order) {
    return null;
  }
  const documentId = await ensureRowDocumentId(strapi, SUPPLIER_ORDER_UID, order);
  if (!documentId) {
    return null;
  }
  return { ...order, documentId };
}

async function recordHistory(strapi: any, supplierOrderDocumentId: string, message: string) {
  await strapi.service('api::supplier-order-history-entry.supplier-order-history-entry').record({
    supplierOrderDocumentId,
    message,
  });
}

export default factories.createCoreService(INVOICE_UID, ({ strapi }) => ({
  async createWithTotals(data: any) {
    const supplierOrderRow = await findSupplierOrder(strapi, data?.supplierOrder);
    const supplierOrder = await withSupplierOrderDocumentId(strapi, supplierOrderRow);
    if (!supplierOrder?.documentId) {
      throw new errors.ValidationError('Supplier order not found.');
    }

    const totalAmount = roundMoney(data.totalAmount);
    const amountPaid = 0;
    const invoice = await (strapi as any).documents(INVOICE_UID).create({
      data: {
        ...data,
        supplierOrder: connectDocument(supplierOrder.documentId),
        invoiceNumber: data.invoiceNumber || createInvoiceNumber(),
        totalAmount,
        amountPaid,
        amountRemaining: calculateRemaining(totalAmount, amountPaid),
      },
      populate: ['supplierOrder', 'attachment', 'payments'],
    });

    await recordHistory(
      strapi,
      supplierOrder.documentId,
      `Invoice ${invoice.invoiceNumber} created`,
    );

    return invoice;
  },

  async updateWithTotals(documentId: string, data: any) {
    const existing = await (strapi as any).documents(INVOICE_UID).findOne({
      documentId,
      populate: ['supplierOrder'],
    });

    if (!existing) {
      throw new errors.NotFoundError('Supplier invoice not found.');
    }

    const nextData = { ...data };
    delete nextData.amountPaid;

    const totalAmount = Object.prototype.hasOwnProperty.call(nextData, 'totalAmount')
      ? roundMoney(nextData.totalAmount)
      : roundMoney(existing.totalAmount);
    nextData.totalAmount = totalAmount;
    nextData.amountRemaining = calculateRemaining(totalAmount, existing.amountPaid);

    const updated = await (strapi as any).documents(INVOICE_UID).update({
      documentId,
      data: nextData,
      populate: ['supplierOrder', 'attachment', 'payments'],
    });

    const orderForHistory = await withSupplierOrderDocumentId(
      strapi,
      existing.supplierOrder,
    );
    if (!orderForHistory?.documentId) {
      throw new errors.ValidationError('Supplier order not found.');
    }

    await recordHistory(
      strapi,
      orderForHistory.documentId,
      `Invoice ${existing.invoiceNumber} updated`,
    );

    return updated;
  },

  async deleteWithHistory(documentId: string) {
    const existing = await (strapi as any).documents(INVOICE_UID).findOne({
      documentId,
      populate: ['supplierOrder'],
    });

    if (!existing) {
      throw new errors.NotFoundError('Supplier invoice not found.');
    }

    const deleted = await (strapi as any).documents(INVOICE_UID).delete({ documentId });

    const orderForHistory = await withSupplierOrderDocumentId(
      strapi,
      existing.supplierOrder,
    );
    if (!orderForHistory?.documentId) {
      throw new errors.ValidationError('Supplier order not found.');
    }

    await recordHistory(
      strapi,
      orderForHistory.documentId,
      `Invoice ${existing.invoiceNumber} deleted`,
    );

    return deleted;
  },

  async refreshPaymentTotals(documentId: string) {
    const invoice = await (strapi as any).documents(INVOICE_UID).findOne({
      documentId,
      populate: ['payments'],
    });

    if (!invoice) {
      throw new errors.NotFoundError('Supplier invoice not found.');
    }

    const amountPaid = roundMoney(
      (invoice.payments ?? []).reduce((sum: number, payment: any) => {
        return sum + Number(payment.amount || 0);
      }, 0),
    );

    return (strapi as any).documents(INVOICE_UID).update({
      documentId,
      data: {
        amountPaid,
        amountRemaining: calculateRemaining(invoice.totalAmount, amountPaid),
      },
      populate: ['supplierOrder', 'attachment', 'payments'],
    });
  },
}));

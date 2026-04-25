/**
 * supplier-invoice service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { ensureRowDocumentId } from '../../../utils/ensure-document-id';

const INVOICE_UID = 'api::supplier-invoice.supplier-invoice';
const SUPPLIER_ORDER_UID = 'api::supplier-order.supplier-order';
const SUPPLIER_UID = 'api::supplier.supplier';

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

function zeroMoney(currencyCode: string): Money {
  return { amount: 0, currency_code: currencyCode };
}

function calculateRemainingMoney(total: Money, paid: Money): Money {
  if (total.currency_code !== paid.currency_code) {
    return { amount: roundMoney(total.amount), currency_code: total.currency_code };
  }
  return {
    amount: Math.max(0, roundMoney(total.amount - paid.amount)),
    currency_code: total.currency_code,
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

async function findSupplierOrder(strapi: any, supplierOrderValue: any) {
  const ref = extractRelationRef(supplierOrderValue);
  if (ref == null || ref === '') {
    throw new errors.ValidationError('A supplier order is required.');
  }

  if (typeof ref === 'number' || (typeof ref === 'string' && /^\d+$/.test(String(ref)))) {
    return strapi.db.query(SUPPLIER_ORDER_UID).findOne({
      where: { id: Number(ref) },
      populate: ['supplier'],
    });
  }

  return strapi.documents(SUPPLIER_ORDER_UID).findOne({
    documentId: String(ref),
    populate: ['supplier'],
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

async function resolveSupplierName(strapi: any, supplierOrder: any): Promise<string | null> {
  const supplier = supplierOrder?.supplier;
  if (!supplier) {
    return null;
  }
  if (typeof supplier?.name === 'string' && supplier.name.trim() !== '') {
    return supplier.name.trim();
  }

  const supplierDocumentId = await ensureRowDocumentId(strapi, SUPPLIER_UID, supplier);
  if (!supplierDocumentId) {
    return null;
  }

  const supplierDocument = await (strapi as any).documents(SUPPLIER_UID).findOne({
    documentId: supplierDocumentId,
  });
  if (!supplierDocument?.name || String(supplierDocument.name).trim() === '') {
    return null;
  }
  return String(supplierDocument.name).trim();
}

function invoiceLabel(invoice: any) {
  if (invoice?.invoiceNumber) {
    return `Invoice ${invoice.invoiceNumber}`;
  }
  return 'Invoice';
}

export default factories.createCoreService(INVOICE_UID, ({ strapi }) => ({
  async createWithTotals(data: any) {
    const total = normalizeMoney(data?.total);
    if (!total) {
      throw new errors.ValidationError('A valid total (amount + currency_code) is required.');
    }

    const supplierOrderRow = await findSupplierOrder(strapi, data?.supplierOrder);
    const supplierOrder = await withSupplierOrderDocumentId(strapi, supplierOrderRow);
    if (!supplierOrder?.documentId) {
      throw new errors.ValidationError('Supplier order not found.');
    }

    const inferredVendorName = await resolveSupplierName(strapi, supplierOrder);
    const vendorName =
      typeof data?.vendorName === 'string' && data.vendorName.trim() !== ''
        ? data.vendorName.trim()
        : inferredVendorName;
    if (!vendorName) {
      throw new errors.ValidationError('Vendor name is required.');
    }

    const amountPaid = zeroMoney(total.currency_code);
    const amountRemaining: Money = { amount: total.amount, currency_code: total.currency_code };

    const {
      supplierOrder: _so,
      total: _t,
      amountPaid: _a,
      amountRemaining: _b,
      totalAmount,
      invoiceNumber: _invoiceNumber,
      vendorName: _vendorName,
      ...rest
    } = data;

    const invoice = await (strapi as any).documents(INVOICE_UID).create({
      data: {
        ...rest,
        supplierOrder: connectDocument(supplierOrder.documentId),
        vendorName,
        total,
        amountPaid,
        amountRemaining,
      },
      populate: ['supplierOrder', 'attachment', 'payments'],
    });

    await recordHistory(
      strapi,
      supplierOrder.documentId,
      `${invoiceLabel(invoice)} created`,
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

    const existingTotal = normalizeMoney(existing.total);
    if (!existingTotal) {
      throw new errors.ValidationError('Existing invoice is missing a valid total (money).');
    }

    const existingPaid = normalizeMoney(existing.amountPaid) ?? zeroMoney(existingTotal.currency_code);
    if (existingPaid.currency_code !== existingTotal.currency_code) {
      throw new errors.ValidationError('Inconsistent amountPaid vs total currency on the invoice.');
    }

    const {
      supplierOrder: _so,
      total,
      amountPaid,
      amountRemaining,
      totalAmount,
      invoiceNumber: _invoiceNumber,
      ...rest
    } = data;

    const nextTotal = Object.prototype.hasOwnProperty.call(data, 'total')
      ? normalizeMoney(total)
      : existingTotal;
    if (!nextTotal) {
      throw new errors.ValidationError('A valid total (amount + currency_code) is required.');
    }

    if (nextTotal.currency_code !== existingPaid.currency_code) {
      if (existingPaid.amount > 0) {
        throw new errors.ValidationError(
          'Total currency must match the currency of recorded payment amounts.',
        );
      }
    }

    const nextPaid =
      nextTotal.currency_code === existingPaid.currency_code
        ? existingPaid
        : zeroMoney(nextTotal.currency_code);
    const nextRemaining = calculateRemainingMoney(nextTotal, nextPaid);

    const updated = await (strapi as any).documents(INVOICE_UID).update({
      documentId,
      data: {
        ...rest,
        total: nextTotal,
        amountPaid: nextPaid,
        amountRemaining: nextRemaining,
      },
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
      `${invoiceLabel(existing)} updated`,
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
      `${invoiceLabel(existing)} deleted`,
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

    const invTotal = normalizeMoney(invoice.total);
    if (!invTotal) {
      throw new errors.ValidationError('Invoice is missing a valid total (money).');
    }

    const paidSum = roundMoney(
      (invoice.payments ?? []).reduce((sum: number, payment: any) => {
        return sum + roundMoney(payment?.paymentAmount?.amount ?? 0);
      }, 0),
    );

    const amountPaid: Money = {
      amount: paidSum,
      currency_code: invTotal.currency_code,
    };

    const amountRemaining: Money = calculateRemainingMoney(invTotal, amountPaid);

    return (strapi as any).documents(INVOICE_UID).update({
      documentId,
      data: {
        amountPaid,
        amountRemaining,
      },
      populate: ['supplierOrder', 'attachment', 'payments'],
    });
  },
}));

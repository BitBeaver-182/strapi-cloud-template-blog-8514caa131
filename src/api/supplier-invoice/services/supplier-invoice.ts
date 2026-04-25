/**
 * supplier-invoice service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/strapi';
import { ensureRowDocumentId } from '../../../utils/ensure-document-id';
import { SUPPLIER_INVOICE_UID } from '../constants';
import { SUPPLIER_ORDER_UID } from '../../supplier-order/constants';
import { SUPPLIER_ORDER_HISTORY_ENTRY_UID } from '../../supplier-order-history-entry/constants';
import { SupplierOrderHistoryEntryService } from '../../supplier-order-history-entry/types';

const SUPPLIER_UID = 'api::supplier.supplier';

type Money = { amount: number; currency_code: string };
type ComputedInvoiceStatus = 'pending' | 'paid' | 'overdue';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function roundMoney(value: unknown) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return 0;
  }
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalizeMoney(m: unknown): Money | null {
  if (!isRecord(m)) {
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

function extractRelationRef(value: unknown): string | number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  if (!isRecord(value)) {
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

function isExpiredDate(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.getTime() <= Date.now();
}

function computeInvoiceStatus(input: {
  amountRemaining: Money | null;
  expirationDate: unknown;
}): ComputedInvoiceStatus {
  const remaining = input.amountRemaining ? roundMoney(input.amountRemaining.amount) : 0;
  if (remaining <= 0) {
    return 'paid';
  }
  if (isExpiredDate(input.expirationDate)) {
    return 'overdue';
  }
  return 'pending';
}

function enrichInvoice(invoice: Record<string, unknown>) {
  const amountRemaining = normalizeMoney(invoice.amountRemaining);
  const status = computeInvoiceStatus({
    amountRemaining,
    expirationDate: invoice.expirationDate,
  });

  return {
    ...invoice,
    invoiceStatus: status,
    is_expired: isExpiredDate(invoice.expirationDate),
  };
}

async function findSupplierOrder(strapi: Core.Strapi, supplierOrderValue: unknown) {
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

async function withSupplierOrderDocumentId(
  strapi: Core.Strapi,
  order: unknown,
): Promise<(Record<string, unknown> & { documentId: string }) | null> {
  if (!order) {
    return null;
  }
  const documentId = await ensureRowDocumentId(strapi, SUPPLIER_ORDER_UID, order);
  if (!documentId) {
    return null;
  }
  if (!isRecord(order)) {
    return null;
  }
  return { ...order, documentId };
}

async function recordHistory(strapi: Core.Strapi, supplierOrderDocumentId: string, message: string) {
  const svc = strapi.service(SUPPLIER_ORDER_HISTORY_ENTRY_UID) as SupplierOrderHistoryEntryService;
  if (!svc || typeof svc !== 'object' || !('record' in svc) || typeof svc.record !== 'function') {
    throw new errors.ApplicationError('History service is missing a record() method.');
  }

  await svc.record({
    supplierOrderDocumentId,
    message,
  });
}

async function resolveSupplierName(strapi: Core.Strapi, supplierOrder: unknown): Promise<string | null> {
  if (!isRecord(supplierOrder)) {
    return null;
  }
  const supplier = supplierOrder.supplier;
  if (!supplier) {
    return null;
  }
  if (isRecord(supplier) && typeof supplier.name === 'string' && supplier.name.trim() !== '') {
    return supplier.name.trim();
  }

  const supplierDocumentId = await ensureRowDocumentId(strapi, SUPPLIER_UID, supplier);
  if (!supplierDocumentId) {
    return null;
  }

  const supplierDocument = await strapi.documents(SUPPLIER_UID).findOne({
    documentId: supplierDocumentId,
  });
  if (!supplierDocument?.name || String(supplierDocument.name).trim() === '') {
    return null;
  }
  return String(supplierDocument.name).trim();
}

function invoiceLabel(invoice: unknown) {
  if (!isRecord(invoice)) {
    return 'Invoice';
  }
  if (typeof invoice.invoiceNumber === 'string' && invoice.invoiceNumber.trim() !== '') {
    return `Invoice ${invoice.invoiceNumber}`;
  }
  return 'Invoice';
}

export default factories.createCoreService(SUPPLIER_INVOICE_UID, ({ strapi }) => ({
  async find(params) {
    const { results, pagination } = await super.find(params);
    return {
      results: results.map((invoice: Record<string, unknown>) => enrichInvoice(invoice)),
      pagination,
    };
  },

  async findOne(documentId, params) {
    const entity = await super.findOne(documentId, params);
    if (!entity) {
      return entity;
    }
    if (!isRecord(entity)) {
      return entity;
    }
    return enrichInvoice(entity);
  },

  async createWithTotals(data: unknown) {
    if (!isRecord(data)) {
      throw new errors.ValidationError('Invalid payload.');
    }
    const payload = data;
    const total = normalizeMoney(payload?.total);
    if (!total) {
      throw new errors.ValidationError('A valid total (amount + currency_code) is required.');
    }

    const rawExpirationDate = payload.expirationDate;
    const expirationDate =
      rawExpirationDate instanceof Date
        ? rawExpirationDate.toISOString()
        : typeof rawExpirationDate === 'string'
          ? rawExpirationDate
          : null;
    if (expirationDate == null || expirationDate.trim() === '') {
      throw new errors.ValidationError('expirationDate is required.');
    }
    const attachment = payload.attachment;
    if (attachment == null) {
      throw new errors.ValidationError('attachment is required.');
    }

    const supplierOrderRow = await findSupplierOrder(strapi, payload?.supplierOrder);
    const supplierOrder = await withSupplierOrderDocumentId(strapi, supplierOrderRow);
    if (!supplierOrder?.documentId) {
      throw new errors.ValidationError('Supplier order not found.');
    }

    const inferredVendorName = await resolveSupplierName(strapi, supplierOrder);
    const vendorName =
      typeof payload?.vendorName === 'string' && payload.vendorName.trim() !== ''
        ? payload.vendorName.trim()
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
      invoiceStatus: _invoiceStatus,
      ...rest
    } = payload;

    const computedStatus = computeInvoiceStatus({
      amountRemaining,
      expirationDate: rest?.expirationDate,
    });

    const invoice = await strapi.documents(SUPPLIER_INVOICE_UID).create({
      data: {
        ...rest,
        expirationDate,
        attachment,
        supplierOrder: supplierOrder.documentId,
        vendorName,
        total,
        amountPaid,
        amountRemaining,
        invoiceStatus: computedStatus,
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

  async updateWithTotals(documentId: string, data: unknown) {
    if (!isRecord(data)) {
      throw new errors.ValidationError('Invalid payload.');
    }
    const payload = data;
    const existing = await strapi.documents(SUPPLIER_INVOICE_UID).findOne({
      documentId,
      populate: ['supplierOrder', 'total', 'amountPaid', 'amountRemaining'],
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
      invoiceStatus: _invoiceStatus,
      ...rest
    } = payload;

    const nextTotal = Object.prototype.hasOwnProperty.call(payload, 'total')
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
    const nextExpirationDate = Object.prototype.hasOwnProperty.call(rest, 'expirationDate')
      ? rest.expirationDate
      : existing.expirationDate;
    const computedStatus = computeInvoiceStatus({
      amountRemaining: nextRemaining,
      expirationDate: nextExpirationDate,
    });

    const updated = await strapi.documents(SUPPLIER_INVOICE_UID).update({
      documentId,
      data: {
        ...rest,
        total: nextTotal,
        amountPaid: nextPaid,
        amountRemaining: nextRemaining,
        invoiceStatus: computedStatus,
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
    const existing = await strapi.documents(SUPPLIER_INVOICE_UID).findOne({
      documentId,
      populate: ['supplierOrder'],
    });

    if (!existing) {
      throw new errors.NotFoundError('Supplier invoice not found.');
    }

    const deleted = await strapi.documents(SUPPLIER_INVOICE_UID).delete({ documentId });

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
    const invoice = await strapi.documents(SUPPLIER_INVOICE_UID).findOne({
      documentId,
      populate: ['total', 'payments'],
    });

    if (!invoice) {
      throw new errors.NotFoundError('Supplier invoice not found.');
    }

    const invTotal = normalizeMoney(invoice.total);
    if (!invTotal) {
      throw new errors.ValidationError('Invoice is missing a valid total (money).');
    }

    const paidSum = roundMoney(
      (invoice.payments ?? []).reduce((sum: number, payment: unknown) => {
        if (!isRecord(payment)) {
          return sum;
        }
        const paymentAmount = payment.paymentAmount;
        if (!isRecord(paymentAmount)) {
          return sum;
        }
        return sum + roundMoney(paymentAmount.amount ?? 0);
      }, 0),
    );

    const amountPaid: Money = {
      amount: paidSum,
      currency_code: invTotal.currency_code,
    };

    const amountRemaining: Money = calculateRemainingMoney(invTotal, amountPaid);
    const computedStatus = computeInvoiceStatus({
      amountRemaining,
      expirationDate: invoice.expirationDate,
    });

    return strapi.documents(SUPPLIER_INVOICE_UID).update({
      documentId,
      data: {
        amountPaid,
        amountRemaining,
        invoiceStatus: computedStatus,
      },
      populate: ['supplierOrder', 'attachment', 'payments'],
    });
  },
}));

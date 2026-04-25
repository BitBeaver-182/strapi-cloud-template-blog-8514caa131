/**
 * supplier-order-history-entry service
 */

import type { Core } from '@strapi/strapi';
import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { SUPPLIER_ORDER_UID } from '../../supplier-order/constants';
import { SUPPLIER_ORDER_HISTORY_ENTRY_UID } from '../constants';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

async function findSupplierOrder(strapi: Core.Strapi, documentId: string) {
  return strapi.documents(SUPPLIER_ORDER_UID).findOne({
    documentId,
    fields: ['documentId'],
  });
}

export default factories.createCoreService(SUPPLIER_ORDER_HISTORY_ENTRY_UID, ({ strapi }) => ({
  async record({
    supplierOrderDocumentId,
    message,
    at = new Date().toISOString(),
    meta,
  }: {
    supplierOrderDocumentId: string;
    message: string;
    at?: string;
    meta?: JsonValue;
  }) {
    if (!supplierOrderDocumentId) {
      throw new errors.ValidationError('Supplier order is required for history entries.');
    }

    const supplierOrder = await findSupplierOrder(strapi, supplierOrderDocumentId);
    if (!supplierOrder) {
      throw new errors.ValidationError('Supplier order not found.');
    }

    return strapi.documents(SUPPLIER_ORDER_HISTORY_ENTRY_UID).create({
      data: {
        supplierOrder: { documentId: String(supplierOrder.documentId) },
        message,
        at,
        meta,
      },
    });
  },
}));

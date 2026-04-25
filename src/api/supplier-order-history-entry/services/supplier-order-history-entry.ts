/**
 * supplier-order-history-entry service
 */

import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const HISTORY_UID = 'api::supplier-order-history-entry.supplier-order-history-entry';
const SUPPLIER_ORDER_UID = 'api::supplier-order.supplier-order';

async function findSupplierOrder(strapi: any, documentId: string) {
  return strapi.documents(SUPPLIER_ORDER_UID).findOne({ documentId });
}

export default factories.createCoreService(HISTORY_UID, ({ strapi }) => ({
  async record({
    supplierOrderDocumentId,
    message,
    at = new Date().toISOString(),
    meta,
  }: {
    supplierOrderDocumentId: string;
    message: string;
    at?: string;
    meta?: Record<string, unknown>;
  }) {
    if (!supplierOrderDocumentId) {
      throw new errors.ValidationError('Supplier order is required for history entries.');
    }

    const supplierOrder = await findSupplierOrder(strapi, supplierOrderDocumentId);
    if (!supplierOrder) {
      throw new errors.ValidationError('Supplier order not found.');
    }

    return (strapi as any).documents(HISTORY_UID).create({
      data: {
        supplierOrder: { connect: [supplierOrder.documentId] },
        message,
        at,
        meta,
      },
    });
  },
}));

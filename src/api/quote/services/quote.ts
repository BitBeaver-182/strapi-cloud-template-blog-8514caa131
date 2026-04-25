import { factories } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const QUOTE_UID = 'api::quote.quote';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

function withComputedExpired<T extends Record<string, unknown>>(quote: T) {
  return {
    ...quote,
    is_expired: isExpiredDate(quote.expiration_date),
  };
}

export default factories.createCoreService(QUOTE_UID, ({ strapi }) => ({
  async find(params) {
    const { results, pagination } = await super.find(params);
    return {
      results: results.map((quote: Record<string, unknown>) => withComputedExpired(quote)),
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
    return withComputedExpired(entity);
  },

  async deleteWithGuards(documentId: string) {
    const existing = await strapi.documents(QUOTE_UID).findOne({
      documentId,
      populate: {
        orders: { fields: ['id'] },
        supplierOrders: { fields: ['id'] },
      },
    });

    if (!existing) {
      throw new errors.NotFoundError('Quote not found.');
    }

    if (existing.quote_status !== 'pending') {
      throw new errors.ValidationError('Only pending quotes can be deleted.');
    }

    const hasOrders = Array.isArray(existing.orders) && existing.orders.length > 0;
    const hasSupplierOrders =
      Array.isArray(existing.supplierOrders) && existing.supplierOrders.length > 0;

    if (hasOrders || hasSupplierOrders) {
      throw new errors.ValidationError('This quote has linked orders and cannot be deleted.');
    }

    return strapi.documents(QUOTE_UID).delete({ documentId });
  },

}));

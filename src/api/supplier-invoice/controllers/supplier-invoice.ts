/**
 * supplier-invoice controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::supplier-invoice.supplier-invoice', ({ strapi }) => ({
  async create(ctx) {
    const data = ctx.request.body?.data ?? {};
    const entity = await (strapi.service('api::supplier-invoice.supplier-invoice') as any)
      .createWithTotals(data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },

  async update(ctx) {
    const data = ctx.request.body?.data ?? {};
    const entity = await (strapi.service('api::supplier-invoice.supplier-invoice') as any)
      .updateWithTotals(ctx.params.documentId, data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },

  async delete(ctx) {
    const entity = await (strapi.service('api::supplier-invoice.supplier-invoice') as any)
      .deleteWithHistory(ctx.params.documentId);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },
}));

/**
 * supplier-order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::supplier-order.supplier-order', ({ strapi }) => ({
  async create(ctx) {
    const data = ctx.request.body?.data ?? {};
    const entity = await (strapi.service('api::supplier-order.supplier-order') as any)
      .createWithInferredSupplier(data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },

  async update(ctx) {
    const data = ctx.request.body?.data ?? {};
    const entity = await (strapi.service('api::supplier-order.supplier-order') as any)
      .updateWithHistory(ctx.params.documentId, data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },
}));

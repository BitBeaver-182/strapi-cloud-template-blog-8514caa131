/**
 * supplier-invoice-payment controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::supplier-invoice-payment.supplier-invoice-payment',
  ({ strapi }) => ({
    async create(ctx) {
      const data = ctx.request.body?.data ?? {};
      const entity = await (strapi.service(
        'api::supplier-invoice-payment.supplier-invoice-payment',
      ) as any).createWithInvoiceTotals(data);
      const sanitized = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitized);
    },

    async update(ctx) {
      const data = ctx.request.body?.data ?? {};
      const entity = await (strapi.service(
        'api::supplier-invoice-payment.supplier-invoice-payment',
      ) as any).updateWithInvoiceTotals(ctx.params.documentId, data);
      const sanitized = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitized);
    },

    async delete(ctx) {
      const entity = await (strapi.service(
        'api::supplier-invoice-payment.supplier-invoice-payment',
      ) as any).deleteWithInvoiceTotals(ctx.params.documentId);
      const sanitized = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitized);
    },
  }),
);

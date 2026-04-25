/**
 * supplier-invoice-payment controller
 */

import { factories } from '@strapi/strapi';
import { SUPPLIER_INVOICE_PAYMENT_UID } from '../constants';

export default factories.createCoreController(
  SUPPLIER_INVOICE_PAYMENT_UID,
  ({ strapi }) => ({
    async create(ctx) {
      const data = ctx.request.body?.data ?? {};
      const entity = await (strapi.service(
        SUPPLIER_INVOICE_PAYMENT_UID,
      ) as any).createWithInvoiceTotals(data);
      const sanitized = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitized);
    },

    async update(ctx) {
      const data = ctx.request.body?.data ?? {};
      const entity = await (strapi.service(
        SUPPLIER_INVOICE_PAYMENT_UID,
      ) as any).updateWithInvoiceTotals(ctx.params.documentId, data);
      const sanitized = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitized);
    },

    async delete(ctx) {
      const entity = await (strapi.service(
        SUPPLIER_INVOICE_PAYMENT_UID,
      ) as any).deleteWithInvoiceTotals(ctx.params.documentId);
      const sanitized = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitized);
    },
  }),
);

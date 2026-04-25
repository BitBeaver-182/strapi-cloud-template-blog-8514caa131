/**
 * supplier-invoice controller
 */

import { factories } from '@strapi/strapi';
import { SUPPLIER_INVOICE_UID } from '../constants';
import { SupplierInvoiceService } from '../types';


export default factories.createCoreController(SUPPLIER_INVOICE_UID, ({ strapi }) => ({
  async create(ctx) {
    const data = ctx.request.body?.data ?? {};
    const supplierInvoiceService = strapi.service(SUPPLIER_INVOICE_UID) as SupplierInvoiceService;
    const entity = await supplierInvoiceService.createWithTotals(data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },

  async update(ctx) {
    const data = ctx.request.body?.data ?? {};
    const supplierInvoiceService = strapi.service(SUPPLIER_INVOICE_UID) as SupplierInvoiceService;
    const entity = await supplierInvoiceService.updateWithTotals(ctx.params.documentId, data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },

  async delete(ctx) {
    const supplierInvoiceService = strapi.service(SUPPLIER_INVOICE_UID) as SupplierInvoiceService;
    const entity = await supplierInvoiceService.deleteWithHistory(ctx.params.documentId);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },
}));

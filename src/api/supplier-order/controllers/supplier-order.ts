import { factories } from '@strapi/strapi';
import { SUPPLIER_ORDER_UID } from '../constants';
import { SupplierOrderService } from '../types';


export default factories.createCoreController(SUPPLIER_ORDER_UID, ({ strapi }) => ({
  async create(ctx) {
    const data = ctx.request.body?.data ?? {};
    const supplierOrderService = strapi.service(SUPPLIER_ORDER_UID) as SupplierOrderService;
    const entity = await supplierOrderService.createWithInferredSupplier(data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },

  async update(ctx) {
    const data = ctx.request.body?.data ?? {};
    const supplierOrderService = strapi.service(SUPPLIER_ORDER_UID) as SupplierOrderService;
    const entity = await supplierOrderService.updateWithHistory(ctx.params.documentId, data);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },

  async delete(ctx) {
    const supplierOrderService = strapi.service(SUPPLIER_ORDER_UID) as SupplierOrderService;
    const entity = await supplierOrderService.deleteWithGuards(ctx.params.documentId);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },
}));

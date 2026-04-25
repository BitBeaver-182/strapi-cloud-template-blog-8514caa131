import type supplierOrderService from './services/supplier-order';
import type supplierOrderController from './controllers/supplier-order';

export type SupplierOrderService = ReturnType<typeof supplierOrderService>;
export type SupplierOrderController = ReturnType<typeof supplierOrderController>;
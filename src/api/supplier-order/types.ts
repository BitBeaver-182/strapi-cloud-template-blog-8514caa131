import type supplierOrderService from './services/supplier-order';
import type supplierOrderController from './controllers/supplier-order';
import type { Data } from '@strapi/types';
import { SUPPLIER_ORDER_UID } from './constants';

export type SupplierOrderService = ReturnType<typeof supplierOrderService>;
export type SupplierOrderController = ReturnType<typeof supplierOrderController>;
export type SupplierOrder = Data.ContentType<typeof SUPPLIER_ORDER_UID>;

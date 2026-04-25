import type supplierService from './services/supplier';
import type supplierController from './controllers/supplier';

export type SupplierService = ReturnType<typeof supplierService>;
export type SupplierController = ReturnType<typeof supplierController>;
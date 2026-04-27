import type supplierService from './services/supplier';
import type supplierController from './controllers/supplier';
import type { Data } from '@strapi/types';
import { SUPPLIER_UID } from './constants';

export type SupplierService = ReturnType<typeof supplierService>;
export type SupplierController = ReturnType<typeof supplierController>;

export type Supplier = Data.ContentType<typeof SUPPLIER_UID>;
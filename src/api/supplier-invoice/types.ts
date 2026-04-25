import type supplierInvoiceService from './services/supplier-invoice';
import type supplierInvoiceController from './controllers/supplier-invoice';

export type SupplierInvoiceService = ReturnType<typeof supplierInvoiceService>;
export type SupplierInvoiceController = ReturnType<typeof supplierInvoiceController>;
import type supplierInvoiceService from './services/supplier-invoice';
import type supplierInvoiceController from './controllers/supplier-invoice';
import type { Data } from '@strapi/types';
import { SUPPLIER_INVOICE_UID } from './constants';

export type SupplierInvoiceService = ReturnType<typeof supplierInvoiceService>;
export type SupplierInvoiceController = ReturnType<typeof supplierInvoiceController>;
export type SupplierInvoice = Data.ContentType<typeof SUPPLIER_INVOICE_UID>;

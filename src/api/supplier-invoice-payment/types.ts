import type supplierInvoicePaymentService from './services/supplier-invoice-payment';
import type supplierInvoicePaymentController from './controllers/supplier-invoice-payment';
import type { Data } from '@strapi/types';
import { SUPPLIER_INVOICE_PAYMENT_UID } from './constants';

export type SupplierInvoicePaymentService = ReturnType<typeof supplierInvoicePaymentService>;
export type SupplierInvoicePaymentController = ReturnType<typeof supplierInvoicePaymentController>;
export type SupplierInvoicePayment = Data.ContentType<typeof SUPPLIER_INVOICE_PAYMENT_UID>;

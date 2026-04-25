import type supplierInvoicePaymentService from './services/supplier-invoice-payment';
import type supplierInvoicePaymentController from './controllers/supplier-invoice-payment';

export type SupplierInvoicePaymentService = ReturnType<typeof supplierInvoicePaymentService>;
export type SupplierInvoicePaymentController = ReturnType<typeof supplierInvoicePaymentController>;
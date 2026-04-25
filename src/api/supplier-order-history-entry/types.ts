import type supplierOrderHistoryEntryService from './services/supplier-order-history-entry';
import type supplierOrderHistoryEntryController from './controllers/supplier-order-history-entry';

export type SupplierOrderHistoryEntryService = ReturnType<typeof supplierOrderHistoryEntryService>;
export type SupplierOrderHistoryEntryController = ReturnType<typeof supplierOrderHistoryEntryController>;
import type supplierOrderHistoryEntryService from './services/supplier-order-history-entry';
import type supplierOrderHistoryEntryController from './controllers/supplier-order-history-entry';
import type { Data } from '@strapi/types';
import { SUPPLIER_ORDER_HISTORY_ENTRY_UID } from './constants';

export type SupplierOrderHistoryEntryService = ReturnType<typeof supplierOrderHistoryEntryService>;
export type SupplierOrderHistoryEntryController = ReturnType<typeof supplierOrderHistoryEntryController>;
export type SupplierOrderHistoryEntry = Data.ContentType<typeof SUPPLIER_ORDER_HISTORY_ENTRY_UID>;

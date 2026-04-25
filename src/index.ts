import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import {
  getSupplierPhoneValidationErrors,
  mergeSupplierPhoneErrorsIntoValidationError,
} from './utils/supplier-phone-validation';
import { SUPPLIER_INVOICE_UID } from './api/supplier-invoice/constants';
import { SUPPLIER_INVOICE_PAYMENT_UID } from './api/supplier-invoice-payment/constants';
import { SUPPLIER_ORDER_UID } from './api/supplier-order/constants';

const AUDITED_UIDS = new Set([
  SUPPLIER_ORDER_UID,
  SUPPLIER_INVOICE_UID,
  SUPPLIER_INVOICE_PAYMENT_UID,
]);
const AUDITED_ACTIONS = new Set(['create', 'update', 'delete']);
type AuditedAction = 'create' | 'update' | 'delete';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAuditedAction(value: string): value is AuditedAction {
  return value === 'create' || value === 'update' || value === 'delete';
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

async function migrateSupplierOrderStatuses(strapi: Core.Strapi) {
  const db = strapi?.db?.connection;
  if (!db?.schema) {
    return;
  }

  const tableName = 'supplier_orders';
  const hasTable = await db.schema.hasTable(tableName);
  if (!hasTable) {
    return;
  }

  if (await db.schema.hasColumn(tableName, 'order_status')) {
    await db(tableName).where({ order_status: 'pending' }).update({ order_status: 'draft' });
    return;
  }

  if (await db.schema.hasColumn(tableName, 'orderStatus')) {
    await db(tableName).where({ orderStatus: 'pending' }).update({ orderStatus: 'draft' });
  }
}

async function migrateSupplierInvoiceStatuses(strapi: Core.Strapi) {
  const db = strapi?.db?.connection;
  if (!db?.schema) {
    return;
  }

  const tableName = 'supplier_invoices';
  const hasTable = await db.schema.hasTable(tableName);
  if (!hasTable) {
    return;
  }

  const remapStatuses = async (column: string) => {
    await db(tableName).whereIn(column, ['draft', 'sent', 'cancelled']).update({ [column]: 'pending' });
  };

  if (await db.schema.hasColumn(tableName, 'invoice_status')) {
    await remapStatuses('invoice_status');
    return;
  }

  if (await db.schema.hasColumn(tableName, 'invoiceStatus')) {
    await remapStatuses('invoiceStatus');
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(async (context, next) => {
      const result = await next();
      const action = String(context.action);

      if (!AUDITED_UIDS.has(context.uid) || !AUDITED_ACTIONS.has(action) || !isAuditedAction(action)) {
        return result;
      }

      const params = context.params;
      const document = isRecord(result) ? result : undefined;
      const paramsDocumentId = isRecord(params) ? Reflect.get(params, 'documentId') : undefined;
      const paramsData = isRecord(params) ? Reflect.get(params, 'data') : undefined;

      await strapi.documents('api::audit-log.audit-log').create({
        data: {
          action,
          uid: context.uid,
          targetDocumentId: paramsDocumentId || document?.documentId,
          payload: paramsData ?? null,
          date: new Date().toISOString(),
          meta: {
            contentType: context.contentType?.info?.singularName,
          },
        },
      });

      return result;
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await migrateSupplierOrderStatuses(strapi);
    await migrateSupplierInvoiceStatuses(strapi);

    const ev = strapi.entityValidator;
    const origCreate = ev.validateEntityCreation.bind(ev);
    const origUpdate = ev.validateEntityUpdate.bind(ev);

    ev.validateEntityCreation = async (model, data, options) => {
      const extra =
        getSupplierPhoneValidationErrors(model.uid, toRecord(data), 'creation') ??
        [];
      let result: Awaited<ReturnType<typeof origCreate>>;
      try {
        result = await origCreate(model, data, options);
      } catch (err) {
        mergeSupplierPhoneErrorsIntoValidationError(err, extra);
        throw err;
      }
      if (extra.length > 0) {
        throw new errors.ValidationError(`${extra.length} errors occurred`, {
          errors: extra,
        });
      }
      return result;
    };

    ev.validateEntityUpdate = async (model, data, options, entity) => {
      const extra =
        getSupplierPhoneValidationErrors(model.uid, toRecord(data), 'update') ??
        [];
      let result: Awaited<ReturnType<typeof origUpdate>>;
      try {
        result = await origUpdate(model, data, options, entity);
      } catch (err) {
        mergeSupplierPhoneErrorsIntoValidationError(err, extra);
        throw err;
      }
      if (extra.length > 0) {
        throw new errors.ValidationError(`${extra.length} errors occurred`, {
          errors: extra,
        });
      }
      return result;
    };
  },
};

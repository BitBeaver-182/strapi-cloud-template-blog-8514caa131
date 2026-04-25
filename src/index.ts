import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import {
  getSupplierPhoneValidationErrors,
  mergeSupplierPhoneErrorsIntoValidationError,
} from './utils/supplier-phone-validation';

const AUDITED_UIDS = new Set([
  'api::supplier-order.supplier-order',
  'api::supplier-invoice.supplier-invoice',
  'api::supplier-invoice-payment.supplier-invoice-payment',
]);
const AUDITED_ACTIONS = new Set(['create', 'update', 'delete']);
type AuditedAction = 'create' | 'update' | 'delete';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.documents.use(async (context, next) => {
      const result = await next();
      const action = String(context.action);

      if (!AUDITED_UIDS.has(context.uid) || !AUDITED_ACTIONS.has(action)) {
        return result;
      }

      const params = context.params as any;
      const document = result as any;

      await strapi.documents('api::audit-log.audit-log').create({
        data: {
          action: action as AuditedAction,
          uid: context.uid,
          targetDocumentId: params?.documentId || document?.documentId,
          payload: params?.data ?? null,
          date: new Date().toISOString(),
          meta: {
            contentType: context.contentType?.info?.singularName,
          },
        },
      });

      return result;
    });
  },

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const ev = strapi.entityValidator;
    const origCreate = ev.validateEntityCreation.bind(ev);
    const origUpdate = ev.validateEntityUpdate.bind(ev);

    ev.validateEntityCreation = async (model, data, options) => {
      const extra =
        getSupplierPhoneValidationErrors(model.uid, data as Record<string, unknown>, 'creation') ??
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
        getSupplierPhoneValidationErrors(model.uid, data as Record<string, unknown>, 'update') ??
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

import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import {
  getSupplierPhoneValidationErrors,
  mergeSupplierPhoneErrorsIntoValidationError,
} from './utils/supplier-phone-validation';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

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

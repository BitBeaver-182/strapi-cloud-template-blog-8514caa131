'use strict';

/**
 * The Phone Validator 5 plugin only registers a string-like custom field on the server;
 * validation runs in the Admin UI bundle, not in entity validation. This wraps
 * strapi.entityValidator so API/REST gets the same libphonenumber check as the admin input.
 */

const googleLibphonenumber = require('google-libphonenumber');
const { errors } = require('@strapi/utils');

const SUPPLIER_UID = 'api::supplier.supplier';
const PHONE_FIELD = 'phone_number';

const phoneUtil = googleLibphonenumber.PhoneNumberUtil.getInstance();

function isPhoneValid(phone) {
  try {
    return phoneUtil.isValidNumber(phoneUtil.parseAndKeepRawInput(String(phone)));
  } catch {
    return false;
  }
}

function phoneFieldError(value) {
  return {
    path: [PHONE_FIELD],
    message: 'phone_number must be a valid phone number',
    name: 'ValidationError',
    value,
  };
}

/**
 * @param {{ uid?: string }} model
 * @param {Record<string, unknown>} data
 * @param {'create' | 'update'} mode
 */
function getSupplierPhoneError(model, data, mode) {
  if (!model || model.uid !== SUPPLIER_UID || !data || typeof data !== 'object') {
    return null;
  }
  if (mode === 'update' && !Object.prototype.hasOwnProperty.call(data, PHONE_FIELD)) {
    return null;
  }
  const raw = data[PHONE_FIELD];
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
    return null;
  }
  if (isPhoneValid(raw)) {
    return null;
  }
  return phoneFieldError(raw);
}

function registerSupplierPhoneValidation(strapi) {
  const ev = strapi && strapi.entityValidator;
  if (!ev?.validateEntityCreation || !ev?.validateEntityUpdate) {
    return;
  }

  const origCreate = ev.validateEntityCreation.bind(ev);
  const origUpdate = ev.validateEntityUpdate.bind(ev);

  ev.validateEntityCreation = async (model, data, options) => {
    try {
      const result = await origCreate(model, data, options);
      const pe = getSupplierPhoneError(model, data, 'create');
      if (pe) {
        throw new errors.ValidationError('1 error occurred', { errors: [pe] });
      }
      return result;
    } catch (e) {
      const pe = getSupplierPhoneError(model, data, 'create');
      if (!pe) {
        throw e;
      }
      if (!(e instanceof errors.ValidationError) || !e.details?.errors) {
        throw e;
      }
      const merged = [...e.details.errors, pe];
      throw new errors.ValidationError(`${merged.length} errors occurred`, {
        errors: merged,
      });
    }
  };

  ev.validateEntityUpdate = async (model, data, options, entity) => {
    try {
      const result = await origUpdate(model, data, options, entity);
      const pe = getSupplierPhoneError(model, data, 'update');
      if (pe) {
        throw new errors.ValidationError('1 error occurred', { errors: [pe] });
      }
      return result;
    } catch (e) {
      const pe = getSupplierPhoneError(model, data, 'update');
      if (!pe) {
        throw e;
      }
      if (!(e instanceof errors.ValidationError) || !e.details?.errors) {
        throw e;
      }
      const merged = [...e.details.errors, pe];
      throw new errors.ValidationError(`${merged.length} errors occurred`, {
        errors: merged,
      });
    }
  };
}

module.exports = { registerSupplierPhoneValidation };

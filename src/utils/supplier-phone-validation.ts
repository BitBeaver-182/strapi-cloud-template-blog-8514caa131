import { errors } from '@strapi/utils';

const SUPPLIER_UID = 'api::supplier.supplier';
const PHONE_FIELD = 'phone_number';

type ValidationDetail = {
  path: string[];
  message: string;
  name: string;
  value?: string;
};

function getPhoneNumberUtil() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PhoneNumberUtil } = require('google-libphonenumber');
  return PhoneNumberUtil.getInstance() as {
    parseAndKeepRawInput: (input: string, defaultRegion: string) => unknown;
    isValidNumber: (number: unknown) => boolean;
  };
}

/**
 * Strapi entity validation treats `customField` (phone plugin) as yup.mixed() with no format check.
 * Returns entries when the submitted value is non-empty and not valid per libphonenumber.
 */
export function getSupplierPhoneValidationErrors(
  uid: string,
  data: Record<string, unknown>,
  mode: 'creation' | 'update',
): ValidationDetail[] | null {
  if (uid !== SUPPLIER_UID) {
    return null;
  }
  if (mode === 'update' && !Object.prototype.hasOwnProperty.call(data, PHONE_FIELD)) {
    return null;
  }

  const raw = data[PHONE_FIELD];
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  const s = String(raw).trim();
  if (s === '') {
    return null;
  }

  const phoneUtil = getPhoneNumberUtil();
  try {
    const parsed = phoneUtil.parseAndKeepRawInput(s, 'US');
    if (phoneUtil.isValidNumber(parsed)) {
      return null;
    }
  } catch {
    // invalid / unparseable
  }

  return [
    {
      path: [PHONE_FIELD],
      message: `${PHONE_FIELD} must be a valid phone`,
      name: 'ValidationError',
      value: s,
    },
  ];
}

export function mergeSupplierPhoneErrorsIntoValidationError(
  err: unknown,
  extra: ValidationDetail[],
): void {
  if (!(err instanceof errors.ValidationError) || extra.length === 0) {
    return;
  }
  const existing = ((err.details as { errors?: ValidationDetail[] })?.errors ??
    []) as ValidationDetail[];
  const merged = [...existing, ...extra];
  err.details = { errors: merged } as typeof err.details;
  err.message = `${merged.length} errors occurred`;
}

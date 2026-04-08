import { Core } from "@strapi/strapi";

export default (_config, { strapi }) => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      throw err;
    }

    // This WILL run after Strapi formats the error
    if (ctx.body?.error?.details?.errors) {
      ctx.body.error.details.errors = ctx.body.error.details.errors.map((err) => {
        const mapped = strapiMessageToKey(err.message, strapi);

        return {
          ...err,
          key: mapped.key,
          params: mapped.params || {},
        };
      });
    }
  };
};


function strapiMessageToKey(
  message: string,
  strapi: Core.Strapi
): ValidationError {
  for (const [pattern, key] of MESSAGE_MAP) {
    const match = message.match(pattern);

    if (match) {
      if (key === "validation.minLength") {
        return { key, params: { min: Number(match[1]) } };
      }

      if (key === "validation.maxLength") {
        return { key, params: { max: Number(match[1]) } };
      }

      return { key };
    }
  }

  strapi.log.warn(`[validation] Unmapped Strapi message: "${message}"`);

  return { key: null };
}

const MESSAGE_MAP: Array<[RegExp, string]> = [
  [/must be defined/i, "validation.required"],
  [/is a required field/i, "validation.required"],
  [/must be a string/i, "validation.string"],
  [/must be a valid email/i, "validation.email"],
  [/must be at least (\d+) char/i, "validation.minLength"],
  [/must be at most (\d+) char/i, "validation.maxLength"],
  [/must be a valid url/i, "validation.url"],
  [/must be a valid phone/i, "validation.phone"],
]


type ValidationError = {
  key: string;
  params?: Record<string, any>;
};

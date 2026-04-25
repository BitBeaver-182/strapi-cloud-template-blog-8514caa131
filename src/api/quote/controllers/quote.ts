import { factories } from '@strapi/strapi';

type QuoteService = {
  deleteWithGuards(documentId: string): Promise<unknown>;
};

function isQuoteService(value: unknown): value is QuoteService {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return (
    'deleteWithGuards' in value &&
    typeof Reflect.get(value, 'deleteWithGuards') === 'function'
  );
}

export default factories.createCoreController('api::quote.quote', ({ strapi }) => ({
  async delete(ctx) {
    const quoteService = strapi.service('api::quote.quote');
    if (!isQuoteService(quoteService)) {
      throw new Error('Quote service is missing deleteWithGuards()');
    }
    const entity = await quoteService.deleteWithGuards(ctx.params.documentId);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },
}));

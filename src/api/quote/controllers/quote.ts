import { factories } from '@strapi/strapi';
import { QUOTE_UID } from '../constants';
import { QuoteService } from '../types';

export default factories.createCoreController(QUOTE_UID, ({ strapi }) => ({
  async delete(ctx) {
    const quoteService = strapi.service(QUOTE_UID) as QuoteService;
    const entity = await quoteService.deleteWithGuards(ctx.params.documentId);
    const sanitized = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitized);
  },
}));

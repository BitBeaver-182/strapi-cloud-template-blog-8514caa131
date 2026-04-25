import type quoteService from './services/quote';
import type quoteController from './controllers/quote';

export type QuoteService = ReturnType<typeof quoteService>;
export type QuoteController = ReturnType<typeof quoteController>;
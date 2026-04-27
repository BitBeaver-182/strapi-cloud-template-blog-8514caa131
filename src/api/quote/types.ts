import type quoteService from './services/quote';
import type quoteController from './controllers/quote';
import type { Data } from '@strapi/types';
import { QUOTE_UID } from './constants';

export type QuoteService = ReturnType<typeof quoteService>;
export type QuoteController = ReturnType<typeof quoteController>;
export type Quote = Data.ContentType<typeof QUOTE_UID>;

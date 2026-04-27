import type currencyService from './services/currency';
import type currencyController from './controllers/currency';
import type { Data } from '@strapi/types';
import { CURRENCY_UID } from './constants';

export type CurrencyService = ReturnType<typeof currencyService>;
export type CurrencyController = ReturnType<typeof currencyController>;
export type Currency = Data.ContentType<typeof CURRENCY_UID>;

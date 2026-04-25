import type currencyService from './services/currency';
import type currencyController from './controllers/currency';

export type CurrencyService = ReturnType<typeof currencyService>;
export type CurrencyController = ReturnType<typeof currencyController>;
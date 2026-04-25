import type globalService from './services/global';
import type globalController from './controllers/global';

export type GlobalService = ReturnType<typeof globalService>;
export type GlobalController = ReturnType<typeof globalController>;
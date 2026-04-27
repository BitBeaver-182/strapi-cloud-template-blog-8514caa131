import type globalService from './services/global';
import type globalController from './controllers/global';
import type { Data } from '@strapi/types';
import { GLOBAL_UID } from './constants';

export type GlobalService = ReturnType<typeof globalService>;
export type GlobalController = ReturnType<typeof globalController>;
export type Global = Data.ContentType<typeof GLOBAL_UID>;

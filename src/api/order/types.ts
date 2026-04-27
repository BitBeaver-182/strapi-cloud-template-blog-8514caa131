import type orderService from './services/order';
import type orderController from './controllers/order';
import type { Data } from '@strapi/types';
import { ORDER_UID } from './constants';

export type OrderService = ReturnType<typeof orderService>;
export type OrderController = ReturnType<typeof orderController>;
export type Order = Data.ContentType<typeof ORDER_UID>;

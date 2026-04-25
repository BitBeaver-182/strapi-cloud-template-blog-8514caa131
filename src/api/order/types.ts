import type orderService from './services/order';
import type orderController from './controllers/order';

export type OrderService = ReturnType<typeof orderService>;
export type OrderController = ReturnType<typeof orderController>;
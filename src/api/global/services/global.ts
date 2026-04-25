import { factories } from '@strapi/strapi';
import { GLOBAL_UID } from '../constants';

export default factories.createCoreService(GLOBAL_UID);


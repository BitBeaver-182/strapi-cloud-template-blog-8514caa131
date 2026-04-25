import { factories } from '@strapi/strapi';
import { AUDIT_LOG_UID } from '../constants';

export default factories.createCoreRouter(AUDIT_LOG_UID);

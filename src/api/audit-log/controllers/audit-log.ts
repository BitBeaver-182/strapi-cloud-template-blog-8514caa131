import { factories } from '@strapi/strapi';
import { AUDIT_LOG_UID } from '../constants';

export default factories.createCoreController(AUDIT_LOG_UID);

import type auditLogService from './services/audit-log';
import type auditLogController from './controllers/audit-log';
import type { Data } from '@strapi/types';
import { AUDIT_LOG_UID } from './constants';

export type AuditLogService = ReturnType<typeof auditLogService>;
export type AuditLogController = ReturnType<typeof auditLogController>;
export type AuditLog = Data.ContentType<typeof AUDIT_LOG_UID>;

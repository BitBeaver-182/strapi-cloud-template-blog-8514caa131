import type auditLogService from './services/audit-log';
import type auditLogController from './controllers/audit-log';

export type AuditLogService = ReturnType<typeof auditLogService>;
export type AuditLogController = ReturnType<typeof auditLogController>;
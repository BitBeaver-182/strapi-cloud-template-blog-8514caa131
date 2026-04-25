import type { Core } from '@strapi/strapi';

type Row = { id?: number; documentId?: string } | null | undefined;

/**
 * When a row comes from the DB query layer, `documentId` is sometimes missing.
 * Document Service `connect` requires the documentId string.
 */
export async function ensureRowDocumentId(
  strapi: Core.Strapi,
  uid: string,
  row: Row,
): Promise<string | null> {
  if (!row) {
    return null;
  }
  if (row.documentId != null && String(row.documentId) !== '') {
    return String(row.documentId);
  }
  if (row.id == null) {
    return null;
  }
  const r = await (strapi.db as any).query(uid).findOne({
    where: { id: row.id },
    select: ['documentId'],
  });
  if (r?.documentId == null) {
    return null;
  }
  return String(r.documentId);
}

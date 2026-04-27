// import { errors } from '@strapi/utils';
// import { SUPPLIER_UID } from '../../constants';

// const SLUG_FIELD = 'slug';
// const NAME_FIELD = 'name';

// function isSlugEmpty(value: unknown) {
//   if (value === undefined || value === null) {
//     return true;
//   }
//   return typeof value === 'string' && value.trim() === '';
// }

// /**
//  * Draft & Publish: application-level `unique` may skip drafts. These queries catch
//  * conflicting name/slug across documents. Rows sharing the same `documentId` (draft
//  * vs published version of one supplier) must not count as duplicates — Strapi can
//  * run `beforeCreate` more than once per REST create, and the second pass would see
//  * the first row without this exclusion.
//  */
// function resolveExcludeDocumentId(
//   data: Record<string, unknown>,
//   excludeFromEvent: unknown,
// ) {
//   if (excludeFromEvent != null && excludeFromEvent !== '') {
//     return String(excludeFromEvent);
//   }
//   if (data.documentId != null && data.documentId !== '') {
//     return String(data.documentId);
//   }
//   return null;
// }

// async function assertUniqueNameAndSlug(
//   strapi: any,
//   data: Record<string, unknown>,
//   excludeDocumentId: string | null,
// ) {
//   const effectiveExclude = resolveExcludeDocumentId(data, excludeDocumentId);

//   const name = data[NAME_FIELD];
//   if (name != null && String(name).trim() !== '') {
//     const trimmed = String(name).trim();
//     const rows = await strapi.db.query(SUPPLIER_UID).findMany({
//       where: { name: trimmed },
//       select: ['id', 'documentId', 'publishedAt'],
//       limit: 50,
//     });
//     const conflict = rows.filter(
//       (r: any) => !effectiveExclude || String(r.documentId) !== effectiveExclude,
//     );
//     if (conflict.length > 0) {
//       throw new errors.ValidationError('A supplier with this name already exists.');
//     }
//   }

//   const slug = data[SLUG_FIELD];
//   if (slug != null && String(slug).trim() !== '') {
//     const trimmed = String(slug).trim();
//     const rows = await strapi.db.query(SUPPLIER_UID).findMany({
//       where: { slug: trimmed },
//       select: ['id', 'documentId', 'publishedAt'],
//       limit: 50,
//     });
//     const conflict = rows.filter(
//       (r: any) => !effectiveExclude || String(r.documentId) !== effectiveExclude,
//     );
//     if (conflict.length > 0) {
//       throw new errors.ValidationError('A supplier with this slug already exists.');
//     }
//   }
// }

// async function resolveDocumentIdFromWhere(strapi: any, where: any) {
//   if (!where) {
//     return null;
//   }
//   if (where.documentId != null) {
//     return String(where.documentId);
//   }
//   if (where.id != null) {
//     const row = await strapi.db.query(SUPPLIER_UID).findOne({
//       where: { id: where.id },
//       select: ['documentId'],
//     });
//     return row?.documentId != null ? String(row.documentId) : null;
//   }
//   return null;
// }

// async function resolveNameForUid(strapi: any, data: any, where: any) {
//   if (data[NAME_FIELD] != null && String(data[NAME_FIELD]).trim() !== '') {
//     return String(data[NAME_FIELD]).trim();
//   }
//   const documentId = await resolveDocumentIdFromWhere(strapi, where);
//   if (!documentId) {
//     return null;
//   }
//   const rows = await strapi.db.query(SUPPLIER_UID).findMany({
//     where: { documentId },
//     select: ['name'],
//     limit: 1,
//   });
//   const n = rows[0]?.name;
//   return n != null && String(n).trim() !== '' ? String(n).trim() : null;
// }

// async function ensureSlugFromName(strapi: any, data: any) {
//   const uidService = strapi.plugin('content-manager')?.service?.('uid');
//   if (!uidService?.generateUIDField) {
//     return;
//   }
//   const name = data[NAME_FIELD];
//   if (name == null || String(name).trim() === '') {
//     return;
//   }
//   data[SLUG_FIELD] = await uidService.generateUIDField({
//     contentTypeUID: SUPPLIER_UID,
//     field: SLUG_FIELD,
//     data: { [NAME_FIELD]: String(name).trim() },
//   });
// }

// export default {
//   async beforeCreate(event: any) {
//     const strapi = (global as any).strapi;
//     if (!strapi?.db) {
//       return;
//     }
//     const data = event.params.data;
//     if (isSlugEmpty(data[SLUG_FIELD])) {
//       await ensureSlugFromName(strapi, data);
//     }
//     await assertUniqueNameAndSlug(strapi, data, null);
//   },

//   async beforeUpdate(event: any) {
//     const strapi = (global as any).strapi;
//     if (!strapi?.db) {
//       return;
//     }
//     const { data, where } = event.params;
//     const excludeDocumentId = await resolveDocumentIdFromWhere(strapi, where);

//     if (
//       Object.prototype.hasOwnProperty.call(data, SLUG_FIELD) &&
//       isSlugEmpty(data[SLUG_FIELD])
//     ) {
//       const name = await resolveNameForUid(strapi, data, where);
//       if (name) {
//         const patch = { ...data, [NAME_FIELD]: name };
//         await ensureSlugFromName(strapi, patch);
//         data[SLUG_FIELD] = patch[SLUG_FIELD];
//       }
//     }

//     if (Object.prototype.hasOwnProperty.call(data, NAME_FIELD)) {
//       await assertUniqueNameAndSlug(strapi, data, excludeDocumentId);
//     } else if (
//       Object.prototype.hasOwnProperty.call(data, SLUG_FIELD) &&
//       !isSlugEmpty(data[SLUG_FIELD])
//     ) {
//       await assertUniqueNameAndSlug(strapi, data, excludeDocumentId);
//     }
//   },
// };


import { errors } from '@strapi/utils';
import { QUOTE_UID } from '../../../quote/constants';
import { ORDER_UID } from '../../constants';

function roundMoney(value: unknown) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getCurrencyIdFromMoney(money: any) {
  if (!money?.currency) return null;
  const c = money.currency;
  if (typeof c === 'number' || typeof c === 'string') return Number(c);
  if (typeof c === 'object' && c.id != null) return Number(c.id);
  return null;
}

function fillLineTotals(data: any) {
  if (!data.lines || !Array.isArray(data.lines)) return;

  for (const line of data.lines) {
    const up = line.unit_price;
    const qty = Number(line.quantity);
    if (!up || up.amount == null || Number.isNaN(qty)) continue;

    const upCur = getCurrencyIdFromMoney(up);
    const lt = line.line_total;
    const ltCur = lt ? getCurrencyIdFromMoney(lt) : null;

    const hasLineTotalAmount = lt && lt.amount != null && lt.amount !== '';

    if (!hasLineTotalAmount && upCur != null && (!lt || ltCur === upCur || ltCur == null)) {
      line.line_total = {
        amount: roundMoney(qty * Number(up.amount)),
        currency: up.currency,
      };
    }
  }
}

/**
 * Resolve quote DB id from Strapi relation payload (REST / document service / internal id).
 */
async function resolveQuoteRowId(strapi: any, quote: any) {
  if (quote == null) {
    return null;
  }
  if (typeof quote === 'string') {
    const byDoc = await strapi.db.query(QUOTE_UID).findOne({
      where: { documentId: quote },
      select: ['id'],
    });
    return byDoc?.id ?? null;
  }
  if (typeof quote === 'number' || (typeof quote === 'string' && /^\\d+$/.test(quote))) {
    const row = await strapi.db.query(QUOTE_UID).findOne({
      where: { id: Number(quote) },
      select: ['id'],
    });
    return row?.id ?? null;
  }
  if (typeof quote === 'object') {
    if (quote.documentId) {
      const row = await strapi.db.query(QUOTE_UID).findOne({
        where: { documentId: String(quote.documentId) },
        select: ['id'],
      });
      return row?.id ?? null;
    }
    if (Array.isArray(quote.connect) && quote.connect.length) {
      const x = quote.connect[0];
      if (typeof x === 'string') {
        const row = await strapi.db.query(QUOTE_UID).findOne({
          where: { documentId: x },
          select: ['id'],
        });
        return row?.id ?? null;
      }
      if (x && x.documentId) {
        const row = await strapi.db.query(QUOTE_UID).findOne({
          where: { documentId: String(x.documentId) },
          select: ['id'],
        });
        return row?.id ?? null;
      }
      if (x != null && (typeof x === 'number' || /^\\d+$/.test(String(x)))) {
        return Number(x);
      }
    }
    if (Array.isArray(quote.set) && quote.set.length) {
      const x = quote.set[0];
      if (typeof x === 'string') {
        const row = await strapi.db.query(QUOTE_UID).findOne({
          where: { documentId: x },
          select: ['id'],
        });
        return row?.id ?? null;
      }
      if (x && x.documentId) {
        const row = await strapi.db.query(QUOTE_UID).findOne({
          where: { documentId: String(x.documentId) },
          select: ['id'],
        });
        return row?.id ?? null;
      }
    }
  }
  return null;
}

async function assertUniqueQuotePerOrder(strapi: any, { data, where }: any) {
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'quote')) {
    return;
  }
  const quoteRowId = await resolveQuoteRowId(strapi, data.quote);
  if (!quoteRowId) {
    return;
  }

  const existingOrders = await strapi.db.query(ORDER_UID).findMany({
    where: { quote: quoteRowId },
    select: ['id', 'documentId'],
    limit: 10,
  });

  const currentDocumentId = where?.documentId;
  let currentId = null;
  if (currentDocumentId) {
    const self = await strapi.db.query(ORDER_UID).findOne({
      where: { documentId: currentDocumentId },
      select: ['id'],
    });
    currentId = self?.id ?? null;
  }

  const conflict = existingOrders.filter((o: any) => o.id !== currentId);
  if (conflict.length > 0) {
    throw new errors.ValidationError(
      'This quote is already linked to another order. Only one order per quote is allowed.',
    );
  }
}

export default {
  async beforeCreate(event: any) {
    fillLineTotals(event.params.data);
    const strapi = (global as any).strapi;
    if (strapi?.db) {
      await assertUniqueQuotePerOrder(strapi, { data: event.params.data, where: null });
    }
  },
  async beforeUpdate(event: any) {
    if (Object.prototype.hasOwnProperty.call(event.params.data, 'lines')) {
      fillLineTotals(event.params.data);
    }
    const strapi = (global as any).strapi;
    if (strapi?.db) {
      await assertUniqueQuotePerOrder(strapi, {
        data: event.params.data,
        where: event.params.where,
      });
    }
  },
};


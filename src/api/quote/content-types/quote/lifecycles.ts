import { errors } from '@strapi/utils';

/**
 * Strapi list view cannot render nested components (shared.money), so it shows "-".
 * We keep a flat string in sync for display: e.g. "$ 123,00" using currency.symbol and currency.decimals.
 */

function formatMoneyDisplay(amount: unknown, currency: any) {
  if (amount == null || currency == null) {
    return null;
  }
  const n = Number(amount);
  if (Number.isNaN(n)) {
    return null;
  }
  const decimals =
    currency.decimals != null && Number.isFinite(Number(currency.decimals))
      ? Math.max(0, Math.min(4, Math.floor(Number(currency.decimals))))
      : 2;
  const symbol = typeof currency.symbol === 'string' ? currency.symbol.trim() : '';
  const fixed = n.toFixed(decimals);
  const [intPart, decPart = ''] = fixed.split('.');
  const numberPart = decPart.length > 0 ? `${intPart},${decPart}` : intPart;
  return symbol ? `${symbol} ${numberPart}` : numberPart;
}

function extractCurrencyRef(currency: any) {
  if (currency == null) {
    return null;
  }
  if (typeof currency === 'number' || typeof currency === 'string') {
    const n = Number(currency);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof currency === 'object') {
    if (currency.id != null) {
      return Number(currency.id);
    }
    if (currency.documentId != null) {
      return currency.documentId;
    }
    if (Array.isArray(currency.connect) && currency.connect.length) {
      const x = currency.connect[0];
      if (typeof x === 'number' || typeof x === 'string') {
        return Number(x);
      }
      if (x && x.id != null) {
        return Number(x.id);
      }
      if (x && x.documentId != null) {
        return x.documentId;
      }
    }
  }
  return null;
}

async function findCurrency(strapi: any, ref: any) {
  if (ref == null) {
    return null;
  }
  if (typeof ref === 'number' || (typeof ref === 'string' && /^\\d+$/.test(ref))) {
    return strapi.db.query('api::currency.currency').findOne({
      where: { id: Number(ref) },
    });
  }
  return strapi.db.query('api::currency.currency').findOne({
    where: { documentId: String(ref) },
  });
}

async function applyTotalDisplay(strapi: any, data: any) {
  const total = data.total;
  if (total == null) {
    data.total_display = null;
    return;
  }
  const ref = extractCurrencyRef(total.currency);
  const currency = await findCurrency(strapi, ref);
  data.total_display = formatMoneyDisplay(total.amount, currency);
}

function extractUploadedFileId(pdf: any) {
  if (pdf == null) {
    return null;
  }
  if (typeof pdf === 'number' || (typeof pdf === 'string' && /^\\d+$/.test(pdf))) {
    return Number(pdf);
  }
  if (typeof pdf === 'object') {
    if (pdf.id != null) {
      return Number(pdf.id);
    }
    if (Array.isArray(pdf.connect) && pdf.connect.length) {
      const x = pdf.connect[0];
      if (typeof x === 'number' || (typeof x === 'string' && /^\\d+$/.test(x))) {
        return Number(x);
      }
      if (x && x.id != null) {
        return Number(x.id);
      }
    }
  }
  return null;
}

async function assertPdfOnly(strapi: any, data: any) {
  if (!Object.prototype.hasOwnProperty.call(data, 'pdf')) {
    return;
  }
  const id = extractUploadedFileId(data.pdf);
  if (id == null) {
    return;
  }
  const file = await strapi.db.query('plugin::upload.file').findOne({
    where: { id },
  });
  if (!file) {
    return;
  }
  const mime = (file.mime || '').toLowerCase();
  const name = (file.name || file.ext || '').toLowerCase();
  const okMime = mime === 'application/pdf' || mime === 'application/x-pdf';
  const okExt = name.endsWith('.pdf');
  if (!okMime && !okExt) {
    throw new errors.ValidationError('Quote PDF must be a PDF file.');
  }
}

export default {
  async beforeCreate(event: any) {
    const strapi = (global as any).strapi;
    if (!strapi?.db) {
      return;
    }
    await assertPdfOnly(strapi, event.params.data);
    await applyTotalDisplay(strapi, event.params.data);
  },

  async beforeUpdate(event: any) {
    const strapi = (global as any).strapi;
    if (!strapi?.db) {
      return;
    }
    await assertPdfOnly(strapi, event.params.data);
    if (!Object.prototype.hasOwnProperty.call(event.params.data, 'total')) {
      return;
    }
    await applyTotalDisplay(strapi, event.params.data);
  },
};


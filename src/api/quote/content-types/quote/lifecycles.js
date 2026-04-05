'use strict';

/**
 * Strapi list view cannot render nested components (shared.money), so it shows "-".
 * We keep a flat string in sync for display: e.g. "$ 123,00" using currency.symbol and currency.decimals.
 */

function formatMoneyDisplay(amount, currency) {
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

function extractCurrencyRef(currency) {
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

async function findCurrency(strapi, ref) {
  if (ref == null) {
    return null;
  }
  if (typeof ref === 'number' || (typeof ref === 'string' && /^\d+$/.test(ref))) {
    return strapi.db.query('api::currency.currency').findOne({
      where: { id: Number(ref) },
    });
  }
  return strapi.db.query('api::currency.currency').findOne({
    where: { documentId: String(ref) },
  });
}

async function applyTotalDisplay(strapi, data) {
  const total = data.total;
  if (total == null) {
    data.total_display = null;
    return;
  }
  const ref = extractCurrencyRef(total.currency);
  const currency = await findCurrency(strapi, ref);
  data.total_display = formatMoneyDisplay(total.amount, currency);
}

module.exports = {
  async beforeCreate(event) {
    const strapi = global.strapi;
    if (!strapi?.db) {
      return;
    }
    await applyTotalDisplay(strapi, event.params.data);
  },

  async beforeUpdate(event) {
    if (!Object.prototype.hasOwnProperty.call(event.params.data, 'total')) {
      return;
    }
    const strapi = global.strapi;
    if (!strapi?.db) {
      return;
    }
    await applyTotalDisplay(strapi, event.params.data);
  },
};

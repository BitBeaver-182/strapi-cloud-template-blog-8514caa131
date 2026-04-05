'use strict';

function roundMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getCurrencyIdFromMoney(money) {
  if (!money?.currency) return null;
  const c = money.currency;
  if (typeof c === 'number' || typeof c === 'string') return Number(c);
  if (typeof c === 'object' && c.id != null) return Number(c.id);
  return null;
}

function fillLineTotals(data) {
  if (!data.lines || !Array.isArray(data.lines)) return;

  for (const line of data.lines) {
    const up = line.unit_price;
    const qty = Number(line.quantity);
    if (!up || up.amount == null || Number.isNaN(qty)) continue;

    const upCur = getCurrencyIdFromMoney(up);
    const lt = line.line_total;
    const ltCur = lt ? getCurrencyIdFromMoney(lt) : null;

    const hasLineTotalAmount =
      lt && lt.amount != null && lt.amount !== '';

    if (!hasLineTotalAmount && upCur != null && (!lt || ltCur === upCur || ltCur == null)) {
      line.line_total = {
        amount: roundMoney(qty * Number(up.amount)),
        currency: up.currency,
      };
    }
  }
}

module.exports = {
  async beforeCreate(event) {
    fillLineTotals(event.params.data);
  },
  async beforeUpdate(event) {
    if (Object.prototype.hasOwnProperty.call(event.params.data, 'lines')) {
      fillLineTotals(event.params.data);
    }
  },
};

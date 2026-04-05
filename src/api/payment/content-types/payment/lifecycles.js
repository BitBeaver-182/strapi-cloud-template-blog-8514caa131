'use strict';

function round2(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function extractInvoiceId(invoiceRef) {
  if (invoiceRef == null) return null;
  if (typeof invoiceRef === 'number') return invoiceRef;
  if (typeof invoiceRef === 'string' && /^\d+$/.test(invoiceRef)) return Number(invoiceRef);
  if (typeof invoiceRef === 'object') {
    if (invoiceRef.id != null) return Number(invoiceRef.id);
    if (Array.isArray(invoiceRef.connect) && invoiceRef.connect.length) {
      const c = invoiceRef.connect[0];
      if (typeof c === 'number') return c;
      if (typeof c === 'string' && /^\d+$/.test(c)) return Number(c);
      if (typeof c === 'object' && c.id != null) return Number(c.id);
    }
  }
  return null;
}

async function resolveInvoiceIdFromPaymentResult(strapi, result) {
  let invoiceId = result?.invoice?.id ?? result?.invoice;
  if (!invoiceId && result?.id) {
    const p = await strapi.db.query('api::payment.payment').findOne({
      where: { id: result.id },
      populate: ['invoice'],
    });
    invoiceId = p?.invoice?.id ?? p?.invoice;
  }
  return invoiceId;
}

function extractCurrencyId(ref) {
  if (ref == null) return null;
  if (typeof ref === 'number') return ref;
  if (typeof ref === 'object' && ref.id != null) return Number(ref.id);
  return null;
}

async function validatePayment(strapi, data, excludePaymentId) {
  if (data.status !== 'success') {
    return;
  }

  const invId = extractInvoiceId(data.invoice);
  if (!invId) {
    throw new Error('Payment must reference an invoice');
  }

  const invoice = await strapi.db.query('api::invoice.invoice').findOne({
    where: { id: invId },
    populate: ['total', 'total.currency'],
  });

  if (!invoice?.total) {
    throw new Error('Invoice total is required');
  }

  const invCurId = extractCurrencyId(invoice.total.currency);
  const eq = data.invoice_equivalent;
  if (!eq?.amount && eq?.amount !== 0) {
    throw new Error('invoice_equivalent.amount is required');
  }
  const payCurId = extractCurrencyId(eq.currency);
  if (invCurId && payCurId && invCurId !== payCurId) {
    throw new Error('invoice_equivalent currency must match invoice total currency');
  }

  const totalDue = Number(invoice.total.amount || 0);
  const eqAmt = Number(eq.amount);

  const others = await strapi.db.query('api::payment.payment').findMany({
    where: { invoice: invId, status: 'success' },
  });

  let othersSum = 0;
  for (const p of others) {
    if (excludePaymentId && p.id === excludePaymentId) continue;
    const full = await strapi.db.query('api::payment.payment').findOne({
      where: { id: p.id },
      populate: ['invoice_equivalent'],
    });
    const a = full?.invoice_equivalent?.amount;
    if (a != null) othersSum += Number(a);
  }

  const remaining = round2(totalDue - othersSum);
  if (eqAmt > remaining + 0.0001) {
    throw new Error(
      `invoice_equivalent exceeds remaining invoice balance (${remaining})`
    );
  }
}

async function recalculateInvoiceAndOrder(strapi, invoiceDbId) {
  const invoice = await strapi.db.query('api::invoice.invoice').findOne({
    where: { id: invoiceDbId },
    populate: ['total', 'order'],
  });
  if (!invoice) return;

  const payments = await strapi.db.query('api::payment.payment').findMany({
    where: { invoice: invoiceDbId, status: 'success' },
  });

  let sumPaid = 0;
  for (const p of payments) {
    const full = await strapi.db.query('api::payment.payment').findOne({
      where: { id: p.id },
      populate: ['invoice_equivalent'],
    });
    const amt = full?.invoice_equivalent?.amount;
    if (amt != null) sumPaid += Number(amt);
  }
  sumPaid = round2(sumPaid);

  const totalAmt = invoice.total?.amount != null ? Number(invoice.total.amount) : 0;
  let invStatus = 'pending';
  if (sumPaid <= 0) invStatus = 'pending';
  else if (sumPaid >= totalAmt - 0.0001) invStatus = 'paid';
  else invStatus = 'partially_paid';

  await strapi.db.query('api::invoice.invoice').update({
    where: { id: invoiceDbId },
    data: {
      amount_paid: sumPaid,
      status: invStatus,
    },
  });

  const orderRef = invoice.order;
  const orderId =
    typeof orderRef === 'object' && orderRef !== null ? orderRef.id : orderRef;
  if (!orderId) return;

  await recalculateOrderStatus(strapi, orderId);
}

async function recalculateOrderStatus(strapi, orderDbId) {
  const invoices = await strapi.db.query('api::invoice.invoice').findMany({
    where: { order: orderDbId },
  });

  if (!invoices.length) {
    await strapi.db.query('api::order.order').update({
      where: { id: orderDbId },
      data: { status: 'pending' },
    });
    return;
  }

  let allPaid = true;
  let anyPaid = false;

  for (const inv of invoices) {
    const full = await strapi.db.query('api::invoice.invoice').findOne({
      where: { id: inv.id },
    });
    if (full.status !== 'paid') allPaid = false;
    if (Number(full.amount_paid || 0) > 0) anyPaid = true;
  }

  let orderStatus = 'pending';
  if (allPaid) orderStatus = 'paid';
  else if (anyPaid) orderStatus = 'partially_paid';

  await strapi.db.query('api::order.order').update({
    where: { id: orderDbId },
    data: { status: orderStatus },
  });
}

module.exports = {
  async beforeCreate(event) {
    const strapi = global.strapi;
    if (!strapi?.db) return;
    await validatePayment(strapi, event.params.data, null);
  },

  async beforeUpdate(event) {
    const strapi = global.strapi;
    if (!strapi?.db) return;
    const id = event.params.where?.id;
    if (!id) return;

    const existing = await strapi.db.query('api::payment.payment').findOne({
      where: { id },
      populate: ['invoice', 'invoice_equivalent'],
    });
    if (!existing) return;

    const data = event.params.data;
    let invoiceEquivalent = existing.invoice_equivalent;
    if (data.invoice_equivalent) {
      invoiceEquivalent = { ...invoiceEquivalent, ...data.invoice_equivalent };
    }
    const mergedStatus = data.status !== undefined ? data.status : existing.status;
    if (mergedStatus !== 'success') {
      return;
    }

    await validatePayment(
      strapi,
      {
        invoice: existing.invoice?.id || existing.invoice,
        invoice_equivalent: invoiceEquivalent,
        status: 'success',
      },
      id
    );
  },

  async afterCreate(event) {
    const strapi = global.strapi;
    if (!strapi?.db) return;
    const invoiceId = await resolveInvoiceIdFromPaymentResult(strapi, event.result);
    if (invoiceId) await recalculateInvoiceAndOrder(strapi, invoiceId);
  },

  async afterUpdate(event) {
    const strapi = global.strapi;
    if (!strapi?.db) return;
    const invoiceId = await resolveInvoiceIdFromPaymentResult(strapi, event.result);
    if (invoiceId) await recalculateInvoiceAndOrder(strapi, invoiceId);
  },

  async afterDelete(event) {
    const strapi = global.strapi;
    if (!strapi?.db) return;
    const invoiceId = await resolveInvoiceIdFromPaymentResult(strapi, event.result);
    if (invoiceId) await recalculateInvoiceAndOrder(strapi, invoiceId);
  },
};

/**
 * Sales domain: line normalization, VAT-aware totals, payment validation and
 * immutable sale drafts. No database or framework imports.
 */

import { round2, sum, clamp } from './money.js';

export const DEFAULT_TAX_RATE = 15;

export const ORDER_TYPES = Object.freeze({
  DINE_IN: 'dine_in',
  TAKEAWAY: 'takeaway',
  DELIVERY: 'delivery',
  CURBSIDE: 'curbside'
});

export const PAYMENT_METHODS = Object.freeze([
  'cash', 'mada', 'applepay', 'stcpay', 'visa', 'mastercard', 'card', 'bank', 'credit', 'wallet', 'mixed'
]);

/**
 * Normalize a raw sale line. Prices are exclusive of VAT, matching Saudi
 * simplified-tax-invoice practice in the demo application.
 */
export function normalizeLine(item, index = 0, defaultTaxRate = DEFAULT_TAX_RATE) {
  const qty = Number(item && item.qty);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`INVALID_QTY:${item && item.productId ? item.productId : index}`);
  }
  const price = round2(item.price);
  const lineDiscount = round2(Math.max(0, Number(item.discount) || 0));
  const gross = round2(qty * price);
  const net = round2(gross - lineDiscount);
  const taxRate = item.taxRate === undefined ? Number(defaultTaxRate) || 0 : Number(item.taxRate) || 0;
  const taxable = item.taxable === false ? 0 : net;
  const taxAmount = round2(taxable * taxRate / 100);
  return {
    id: item.id || `line-${index + 1}`,
    productId: item.productId || item.id || `item-${index + 1}`,
    sku: item.sku || '',
    name: item.name || '',
    type: item.type || 'menu',
    categoryId: item.categoryId || null,
    qty,
    price,
    discount: lineDiscount,
    gross,
    net,
    cost: round2(item.cost),
    taxRate,
    taxable,
    taxAmount,
    total: round2(net + taxAmount)
  };
}

export function normalizeLines(items, taxRate = DEFAULT_TAX_RATE) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('SALE_EMPTY');
  return items.map((item, index) => normalizeLine(item, index, taxRate));
}

/**
 * Apply an invoice-level discount proportionally across lines, add service and
 * delivery charges, then compute VAT on both lines and extras.
 */
export function computeTotals(lines, opts = {}) {
  const taxRate = opts.taxRate === undefined ? DEFAULT_TAX_RATE : Number(opts.taxRate) || 0;
  const normalized = Array.isArray(lines) && lines.every((line) => Number.isFinite(line.net))
    ? lines
    : normalizeLines(lines, taxRate);

  const subtotal = round2(sum(normalized, (line) => line.net));
  const discount = round2(clamp(opts.discount, 0, subtotal));
  let tax = 0;

  normalized.forEach((line) => {
    const share = subtotal ? line.net / subtotal : 0;
    line.taxable = round2(line.net - discount * share);
    line.taxAmount = round2(line.taxable * (Number(line.taxRate) || 0) / 100);
    tax += line.taxAmount;
  });

  const serviceCharge = round2(Math.max(0, Number(opts.serviceCharge) || 0));
  const deliveryFee = round2(Math.max(0, Number(opts.deliveryFee) || 0));
  const extras = round2(serviceCharge + deliveryFee);
  const extrasTax = extras > 0 ? round2(extras * taxRate / 100) : 0;
  tax = round2(tax + extrasTax);
  const total = round2(subtotal - discount + extras + tax);

  return {
    subtotal,
    discount,
    serviceCharge,
    deliveryFee,
    extras,
    extrasTax,
    tax,
    total,
    lines: normalized
  };
}

export function deriveMethod(payments, due) {
  const methods = [...new Set((payments || []).map((payment) => payment.method).filter(Boolean))];
  if (methods.length > 1) return 'mixed';
  if (methods.length === 1) return methods[0];
  return due > 0.01 ? 'credit' : 'cash';
}

export function normalizePayments(payments, total, opts = {}) {
  const allowOverpay = opts.allowOverpay !== false;
  let rows = (payments || [])
    .filter((payment) => Number(payment.amount) > 0)
    .map((payment) => ({ method: payment.method || 'cash', amount: round2(payment.amount) }));

  let tendered = round2(sum(rows, (payment) => payment.amount));
  if (tendered > total + 0.01 && !allowOverpay) throw new Error('PAYMENT_EXCEEDS_TOTAL');

  const paid = Math.min(tendered, total);
  const change = round2(Math.max(0, tendered - total));

  if (tendered > paid) {
    let remaining = paid;
    rows = rows.map((payment) => {
      const amount = Math.min(payment.amount, remaining);
      remaining = round2(remaining - amount);
      return { method: payment.method, amount };
    }).filter((payment) => payment.amount > 0);
  }

  return { payments: rows, paid, change, tendered };
}

/**
 * Build a complete sale invoice draft. The caller is responsible for
 * persistence, inventory consumption and journal posting.
 */
export function createSaleDraft(opts = {}) {
  const taxRate = opts.taxRate === undefined ? DEFAULT_TAX_RATE : Number(opts.taxRate) || 0;
  const lines = normalizeLines(opts.items, taxRate);
  const totals = computeTotals(lines, {
    discount: opts.discount,
    serviceCharge: opts.serviceCharge,
    deliveryFee: opts.deliveryFee,
    taxRate
  });

  const { payments, paid, change } = normalizePayments(opts.payments, totals.total, {
    allowOverpay: opts.allowOverpay !== false
  });
  const due = round2(totals.total - paid);
  const customer = opts.customer || null;

  if (due > 0.01 && !customer) throw new Error('CREDIT_REQUIRES_CUSTOMER');
  if (opts.loyaltyPoints && !customer) throw new Error('LOYALTY_REQUIRES_CUSTOMER');

  const id = opts.id || `inv_${Date.now()}`;
  const number = opts.number || `INV-${Date.now()}`;
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const createdAt = opts.createdAt || new Date().toISOString();
  const orderType = opts.orderType || (opts.tableId ? ORDER_TYPES.DINE_IN : ORDER_TYPES.TAKEAWAY);
  const cogs = round2(sum(lines, (line) => line.cost * line.qty));

  const invoice = {
    id,
    number,
    type: 'sale',
    date,
    createdAt,
    customerId: customer ? customer.id || null : null,
    customerName: customer ? customer.name : (opts.customerName || 'عميل نقدي'),
    customerPhone: customer ? customer.phone || '' : (opts.customerPhone || ''),
    items: lines,
    subtotal: totals.subtotal,
    discount: totals.discount,
    serviceCharge: totals.serviceCharge,
    deliveryFee: totals.deliveryFee,
    tax: totals.tax,
    total: totals.total,
    paid,
    change,
    due,
    payments,
    method: deriveMethod(payments, due),
    status: due <= 0.01 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    orderType,
    tableId: opts.tableId || null,
    tableName: opts.tableName || '',
    orderId: opts.orderId || null,
    orderNumber: opts.orderNumber || '',
    source: opts.source || 'pos',
    notes: opts.notes || '',
    cogs,
    profit: round2(totals.subtotal - totals.discount - cogs),
    couponCode: opts.couponCode || '',
    couponDiscount: round2(opts.couponDiscount),
    loyaltyPoints: Math.floor(Number(opts.loyaltyPoints) || 0),
    loyaltyDiscount: round2(opts.loyaltyDiscount),
    branchId: opts.branchId || null,
    cashierId: opts.cashierId || null,
    cashierName: opts.cashierName || '',
    shiftId: opts.shiftId || null
  };

  return { invoice, totals, lines };
}

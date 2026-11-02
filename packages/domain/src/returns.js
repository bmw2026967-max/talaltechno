/**
 * Sales returns / credit notes. Quantities are validated against the original
 * invoice and the returned lines keep the original VAT treatment.
 */

import { round2, sum } from './money.js';

export function createReturnDraft(opts = {}) {
  const original = opts.original;
  if (!original || original.type !== 'sale') throw new Error('ORIGINAL_SALE_REQUIRED');
  if (!Array.isArray(opts.items) || opts.items.length === 0) throw new Error('RETURN_EMPTY');

  const soldByProduct = new Map();
  (original.items || []).forEach((line) => {
    const key = line.productId;
    const current = soldByProduct.get(key) || { line, qty: 0 };
    current.qty += Number(line.qty) || 0;
    soldByProduct.set(key, current);
  });

  const lines = opts.items.map((requested, index) => {
    const sold = soldByProduct.get(requested.productId);
    if (!sold) throw new Error(`RETURN_LINE_NOT_FOUND:${requested.productId}`);
    const qty = Number(requested.qty) || 0;
    if (qty <= 0) throw new Error(`RETURN_QTY_INVALID:${requested.productId}`);
    if (qty > sold.qty + 1e-9) throw new Error(`RETURN_QTY_EXCEEDS_SOLD:${requested.productId}`);

    const source = sold.line;
    const net = round2(qty * (Number(source.price) || 0) - (Number(source.discount) || 0) * (qty / sold.qty));
    const taxRate = Number(source.taxRate) || 0;
    const taxAmount = round2(net * taxRate / 100);
    return {
      id: `ret-line-${index + 1}`,
      productId: source.productId,
      sku: source.sku || '',
      name: source.name || '',
      qty,
      price: round2(source.price),
      discount: round2((Number(source.discount) || 0) * (qty / sold.qty)),
      net,
      cost: round2(source.cost),
      taxRate,
      taxable: net,
      taxAmount,
      total: round2(net + taxAmount)
    };
  });

  const subtotal = round2(sum(lines, (line) => line.net));
  const tax = round2(sum(lines, (line) => line.taxAmount));
  const total = round2(subtotal + tax);
  const cogs = round2(sum(lines, (line) => line.cost * line.qty));
  const refundMethod = opts.refundMethod || (original.customerId ? 'credit' : 'cash');
  if (refundMethod === 'credit' && !original.customerId) throw new Error('CREDIT_REFUND_REQUIRES_CUSTOMER');

  return {
    id: opts.id || `ret_${Date.now()}`,
    number: opts.number || `RET-${Date.now()}`,
    type: 'return',
    date: opts.date || new Date().toISOString().slice(0, 10),
    createdAt: opts.createdAt || new Date().toISOString(),
    originalInvoiceId: original.id,
    originalNumber: original.number,
    customerId: original.customerId || null,
    customerName: original.customerName || 'عميل نقدي',
    items: lines,
    subtotal,
    discount: 0,
    tax,
    total,
    paid: total,
    due: 0,
    payments: [{ method: refundMethod, amount: total }],
    method: refundMethod,
    refundMethod,
    status: 'return',
    orderType: original.orderType || 'takeaway',
    tableName: original.tableName || '',
    orderNumber: original.orderNumber || '',
    branchId: original.branchId || null,
    shiftId: original.shiftId || null,
    cashierId: opts.cashierId || original.cashierId || null,
    cashierName: opts.cashierName || original.cashierName || '',
    cogs,
    profit: round2(-(subtotal - cogs)),
    notes: opts.notes || ''
  };
}

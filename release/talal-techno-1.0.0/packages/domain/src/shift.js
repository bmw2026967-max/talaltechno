/**
 * Cash-shift lifecycle and reconciliation. A shift is scoped to one cashier and
 * one branch; returns reduce expected cash, cash expenses reduce it further.
 */

import { round2, sum } from './money.js';

export const PAYMENT_LABELS = Object.freeze({
  cash: 'نقدي',
  mada: 'مدى',
  applepay: 'Apple Pay',
  stcpay: 'STC Pay',
  visa: 'Visa',
  mastercard: 'Mastercard',
  card: 'شبكة / بطاقة',
  bank: 'تحويل بنكي',
  credit: 'آجل',
  wallet: 'محفظة',
  mixed: 'مختلط'
});

export const methodLabel = (method) => PAYMENT_LABELS[method] || method;

export function summarizeShift(shift, invoices = [], expenses = []) {
  if (!shift) throw new Error('SHIFT_REQUIRED');
  const inShift = (row) => !row.shiftId || row.shiftId === shift.id;
  const sales = (invoices || []).filter((invoice) => invoice.type === 'sale' && inShift(invoice));
  const returns = (invoices || []).filter((invoice) => invoice.type === 'return' && inShift(invoice));
  const shiftExpenses = (expenses || []).filter((expense) => inShift(expense));

  const byMethod = {};
  sales.forEach((invoice) => (invoice.payments || []).forEach((payment) => {
    byMethod[payment.method] = round2((byMethod[payment.method] || 0) + (Number(payment.amount) || 0));
  }));
  returns.forEach((invoice) => (invoice.payments || []).forEach((payment) => {
    byMethod[payment.method] = round2((byMethod[payment.method] || 0) - (Number(payment.amount) || 0));
  }));

  const cashSales = round2(byMethod.cash || 0);
  const cashExpenses = round2(sum(
    shiftExpenses.filter((expense) => (expense.method || 'cash') === 'cash'),
    (expense) => expense.amount
  ));
  const expectedCash = round2((Number(shift.openingCash) || 0) + cashSales - cashExpenses);

  return {
    shift,
    invoices: sales,
    returns,
    expenses: shiftExpenses,
    byMethod,
    cashSales,
    cashExpenses,
    expectedCash,
    sales: round2(sum(sales, (invoice) => invoice.total)),
    tax: round2(sum(sales, (invoice) => invoice.tax)),
    discounts: round2(sum(sales, (invoice) => invoice.discount)),
    cogs: round2(sum(sales, (invoice) => invoice.cogs || sum(invoice.items || [], (item) => (item.cost || 0) * (item.qty || 0)))),
    count: sales.length,
    avgTicket: sales.length ? round2(sum(sales, (invoice) => invoice.total) / sales.length) : 0,
    refunds: round2(sum(returns, (invoice) => invoice.total))
  };
}

export function closeShift(shift, countedCash, invoices = [], expenses = []) {
  if (!shift) throw new Error('SHIFT_REQUIRED');
  if (shift.status !== 'open') throw new Error('SHIFT_ALREADY_CLOSED');
  const summary = summarizeShift(shift, invoices, expenses);
  const closingCash = round2(countedCash);
  if (closingCash < 0) throw new Error('CLOSING_CASH_NEGATIVE');
  return {
    ...shift,
    status: 'closed',
    closedAt: new Date().toISOString(),
    closingCash,
    expectedCash: summary.expectedCash,
    variance: round2(closingCash - summary.expectedCash),
    sales: summary.sales,
    orders: summary.count,
    tax: summary.tax,
    cogs: summary.cogs,
    byMethod: summary.byMethod
  };
}

export function openShift({ id, number, branchId, userId, userName, openingCash, notes, openedAt }) {
  const amount = round2(openingCash);
  if (amount < 0) throw new Error('OPENING_CASH_NEGATIVE');
  if (!userId) throw new Error('SHIFT_USER_REQUIRED');
  return {
    id: id || `shift_${Date.now()}`,
    number: number || `SH-${Date.now()}`,
    branchId: branchId || null,
    userId,
    userName: userName || '',
    openedAt: openedAt || new Date().toISOString(),
    closedAt: null,
    openingCash: amount,
    closingCash: null,
    expectedCash: null,
    variance: null,
    status: 'open',
    notes: notes || ''
  };
}

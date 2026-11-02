/**
 * Double-entry accounting. Every sale, return, purchase, expense and manual
 * entry posts balanced debits and credits. Account codes match the browser demo
 * and the Prisma seed so reports can be compared across both implementations.
 */

import { round2, sum } from './money.js';

export const ACCOUNTS = Object.freeze({
  cash: '1101',
  bank: '1102',
  ar: '1103',
  inventory: '1104',
  vatInput: '1105',
  ap: '2101',
  vatOutput: '2102',
  sales: '4101',
  otherIncome: '4102',
  salesReturns: '4103',
  salesDiscount: '4104',
  cogs: '5101',
  salaries: '5102',
  rent: '5103',
  utilities: '5104',
  marketing: '5105',
  maintenance: '5106',
  bankFees: '5107',
  inventoryLoss: '5108',
  misc: '5109',
  hospitality: '5110',
  telecom: '5111',
  delivery: '5112'
});

export const ACCOUNT_NAMES = Object.freeze({
  [ACCOUNTS.cash]: 'الصندوق (النقدية)',
  [ACCOUNTS.bank]: 'البنك / الشبكة',
  [ACCOUNTS.ar]: 'المدينون (العملاء)',
  [ACCOUNTS.inventory]: 'المخزون',
  [ACCOUNTS.vatInput]: 'ضريبة القيمة المضافة — مدخلات',
  [ACCOUNTS.ap]: 'الدائنون (الموردون)',
  [ACCOUNTS.vatOutput]: 'ضريبة القيمة المضافة — مخرجات',
  [ACCOUNTS.sales]: 'إيرادات المبيعات',
  [ACCOUNTS.otherIncome]: 'إيرادات أخرى (خدمة / توصيل)',
  [ACCOUNTS.salesReturns]: 'مرتجعات المبيعات',
  [ACCOUNTS.salesDiscount]: 'خصم على المبيعات',
  [ACCOUNTS.cogs]: 'تكلفة البضاعة المباعة',
  [ACCOUNTS.inventoryLoss]: 'فاقد المخزون'
});

export function accountForMethod(method) {
  if (method === 'cash') return ACCOUNTS.cash;
  if (method === 'bank') return ACCOUNTS.bank;
  if (method === 'credit') return ACCOUNTS.ar;
  return ACCOUNTS.bank;
}

export function line(accountId, debit, credit, memo = '', extra = {}) {
  return {
    accountId,
    accountCode: accountId,
    accountName: ACCOUNT_NAMES[accountId] || accountId,
    debit: round2(debit),
    credit: round2(credit),
    memo,
    ...extra
  };
}

export function buildSaleJournal(invoice) {
  const lines = [];
  const byMethod = {};
  (invoice.payments || []).forEach((payment) => {
    byMethod[payment.method] = round2((byMethod[payment.method] || 0) + payment.amount);
  });
  Object.entries(byMethod).forEach(([method, amount]) => {
    lines.push(line(accountForMethod(method), amount, 0, `تحصيل ${method} — ${invoice.number}`));
  });

  if (round2(invoice.due) > 0.01) {
    lines.push(line(ACCOUNTS.ar, invoice.due, 0, `مستحق على ${invoice.customerName || 'عميل'}`));
  }
  if (round2(invoice.discount) > 0) {
    lines.push(line(ACCOUNTS.salesDiscount, invoice.discount, 0, 'خصم على الفاتورة'));
  }

  lines.push(line(ACCOUNTS.sales, 0, invoice.subtotal, 'إيراد مبيعات'));
  const extras = round2((Number(invoice.serviceCharge) || 0) + (Number(invoice.deliveryFee) || 0));
  if (extras > 0) {
    lines.push(line(ACCOUNTS.otherIncome, 0, extras, `إيرادات خدمة/توصيل — ${invoice.number}`));
  }
  if (round2(invoice.tax) > 0) {
    lines.push(line(ACCOUNTS.vatOutput, 0, invoice.tax, 'ضريبة القيمة المضافة (مخرجات)'));
  }

  const cogs = round2(invoice.cogs !== undefined
    ? invoice.cogs
    : sum(invoice.items || [], (item) => (Number(item.cost) || 0) * (Number(item.qty) || 0)));
  if (cogs > 0) {
    lines.push(line(ACCOUNTS.cogs, cogs, 0, 'تكلفة البضاعة المباعة'));
    lines.push(line(ACCOUNTS.inventory, 0, cogs, 'صرف مخزون'));
  }

  return entry({
    date: invoice.date,
    description: `فاتورة بيع ${invoice.number} — ${invoice.customerName || 'عميل نقدي'}`,
    sourceType: 'sale',
    sourceId: invoice.id || null,
    sourceNumber: invoice.number,
    lines
  });
}

export function buildReturnJournal(ret) {
  const lines = [];
  lines.push(line(ACCOUNTS.salesReturns, ret.subtotal, 0, `مرتجع مبيعات ${ret.number}`));
  if (round2(ret.tax) > 0) {
    lines.push(line(ACCOUNTS.vatOutput, ret.tax, 0, 'عكس ضريبة المخرجات'));
  }
  const cogs = round2(ret.cogs !== undefined
    ? ret.cogs
    : sum(ret.items || [], (item) => (Number(item.cost) || 0) * (Number(item.qty) || 0)));
  if (cogs > 0) {
    lines.push(line(ACCOUNTS.inventory, cogs, 0, 'استرجاع مخزون'));
    lines.push(line(ACCOUNTS.cogs, 0, cogs, 'عكس تكلفة البضاعة المرتجعة'));
  }
  lines.push(line(accountForMethod(ret.refundMethod || ret.method || 'cash'), 0, ret.total, `استرداد ${ret.number}`));

  return entry({
    date: ret.date,
    description: `مرتجع بيع ${ret.number} — أصل ${ret.originalNumber || ''}`,
    sourceType: 'sale_return',
    sourceId: ret.id || null,
    sourceNumber: ret.number,
    lines
  });
}

export function entry({ date, description, sourceType, sourceId, sourceNumber, lines, createdAt }) {
  const totalDebit = round2(sum(lines, (row) => row.debit));
  const totalCredit = round2(sum(lines, (row) => row.credit));
  return {
    id: `je_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    number: `JE-${Date.now()}`,
    date,
    createdAt: createdAt || new Date().toISOString(),
    description,
    sourceType,
    sourceId: sourceId || null,
    sourceNumber: sourceNumber || '',
    posted: true,
    lines,
    totalDebit,
    totalCredit,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01
  };
}

export function assertBalanced(journal, tolerance = 0.01) {
  const debit = round2(sum(journal.lines || [], (row) => row.debit));
  const credit = round2(sum(journal.lines || [], (row) => row.credit));
  if (Math.abs(debit - credit) > tolerance) {
    throw new Error(`JOURNAL_UNBALANCED:${debit}-${credit}`);
  }
  return true;
}

export function trialBalance(entries) {
  const map = new Map();
  (entries || []).forEach((journal) => {
    (journal.lines || []).forEach((row) => {
      const current = map.get(row.accountId) || {
        accountId: row.accountId,
        accountCode: row.accountId,
        accountName: row.accountName || ACCOUNT_NAMES[row.accountId] || row.accountId,
        debit: 0,
        credit: 0
      };
      current.debit = round2(current.debit + (Number(row.debit) || 0));
      current.credit = round2(current.credit + (Number(row.credit) || 0));
      map.set(row.accountId, current);
    });
  });

  const rows = [...map.values()].map((row) => ({
    ...row,
    balance: round2(row.debit - row.credit)
  })).sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  return {
    rows,
    totalDebit: round2(sum(rows, (row) => row.debit)),
    totalCredit: round2(sum(rows, (row) => row.credit)),
    balanced: Math.abs(round2(sum(rows, (row) => row.debit)) - round2(sum(rows, (row) => row.credit))) < 0.01
  };
}

export function incomeStatement(entries) {
  const revenue = round2(sum(entries || [], (journal) => sum(
    (journal.lines || []).filter((row) => row.accountId === ACCOUNTS.sales),
    (row) => row.credit - row.debit
  )));
  const returns = round2(sum(entries || [], (journal) => sum(
    (journal.lines || []).filter((row) => row.accountId === ACCOUNTS.salesReturns),
    (row) => row.debit - row.credit
  )));
  const discounts = round2(sum(entries || [], (journal) => sum(
    (journal.lines || []).filter((row) => row.accountId === ACCOUNTS.salesDiscount),
    (row) => row.debit - row.credit
  )));
  const otherIncome = round2(sum(entries || [], (journal) => sum(
    (journal.lines || []).filter((row) => row.accountId === ACCOUNTS.otherIncome),
    (row) => row.credit - row.debit
  )));
  const cogs = round2(sum(entries || [], (journal) => sum(
    (journal.lines || []).filter((row) => row.accountId === ACCOUNTS.cogs),
    (row) => row.debit - row.credit
  )));
  const netSales = round2(revenue - returns - discounts);
  const grossProfit = round2(netSales - cogs);
  return { revenue, returns, discounts, otherIncome, netSales, cogs, grossProfit };
}

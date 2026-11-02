import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSaleJournal, buildReturnJournal, trialBalance, incomeStatement, assertBalanced, ACCOUNTS } from '../src/journal.js';
import { makeSale } from './helpers.js';
import { createReturnDraft } from '../src/returns.js';

test('sale journal is balanced and posts cash, VAT and COGS', () => {
  const invoice = makeSale();
  const journal = buildSaleJournal(invoice);

  assert.equal(journal.balanced, true);
  assert.equal(journal.totalDebit, 95.3);
  assert.equal(journal.totalCredit, 95.3);
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.cash && line.debit === 73.6));
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.sales && line.credit === 64));
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.vatOutput && line.credit === 9.6));
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.cogs && line.debit === invoice.cogs));
});

test('credit sale posts receivables for the unpaid remainder', () => {
  const invoice = makeSale({
    payments: [{ method: 'cash', amount: 30 }],
    customer: { id: 'c1', name: 'شركة الواحة' }
  });
  const journal = buildSaleJournal(invoice);
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.ar && line.debit === 43.6));
  assert.equal(journal.balanced, true);
});

test('service and delivery fees post to other income', () => {
  const invoice = makeSale({ serviceCharge: 10, deliveryFee: 5, payments: [{ method: 'cash', amount: 90.85 }] });
  const journal = buildSaleJournal(invoice);
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.otherIncome && line.credit === 15));
  assert.equal(journal.balanced, true);
});

test('return journal reverses revenue, VAT, inventory and cash', () => {
  const original = makeSale();
  const ret = createReturnDraft({ original, items: [{ productId: 'm_kabsa', qty: 1 }], number: 'RET-9001' });
  const journal = buildReturnJournal(ret);

  assert.equal(journal.balanced, true);
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.salesReturns && line.debit === 32));
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.vatOutput && line.debit === 4.8));
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.inventory && line.debit === ret.cogs));
  assert.ok(journal.lines.some((line) => line.accountId === ACCOUNTS.cash && line.credit === 36.8));
});

test('trial balance aggregates debit and credit by account', () => {
  const sale = makeSale();
  const ret = createReturnDraft({ original: sale, items: [{ productId: 'm_kabsa', qty: 1 }] });
  const report = trialBalance([buildSaleJournal(sale), buildReturnJournal(ret)]);

  assert.equal(report.balanced, true);
  assert.equal(report.totalDebit, report.totalCredit);
  const sales = report.rows.find((row) => row.accountId === ACCOUNTS.sales);
  assert.equal(sales.credit, 64);
  const cash = report.rows.find((row) => row.accountId === ACCOUNTS.cash);
  assert.equal(cash.debit, 73.6);
  assert.equal(cash.credit, 36.8);
  assert.equal(cash.balance, 36.8);
});

test('income statement nets returns and cost of goods', () => {
  const sale = makeSale();
  const ret = createReturnDraft({ original: sale, items: [{ productId: 'm_kabsa', qty: 1 }] });
  const report = incomeStatement([buildSaleJournal(sale), buildReturnJournal(ret)]);

  assert.equal(report.revenue, 64);
  assert.equal(report.returns, 32);
  assert.equal(report.cogs, sale.cogs - ret.cogs);
  assert.equal(report.netSales, 32);
  assert.equal(report.grossProfit, report.netSales - report.cogs);
});

test('unbalanced journals are detected', () => {
  assert.throws(() => assertBalanced({
    lines: [
      { accountId: '1101', debit: 10, credit: 0 },
      { accountId: '4101', debit: 0, credit: 9 }
    ]
  }), /JOURNAL_UNBALANCED/);
});

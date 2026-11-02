import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaleDraft, computeTotals, normalizePayments } from '../src/sale.js';

test('sale totals apply VAT to lines and extras', () => {
  const { invoice, totals } = createSaleDraft({
    items: [{ productId: 'm1', name: 'كبسة', qty: 2, price: 32, taxRate: 15 }],
    payments: [{ method: 'cash', amount: 73.6 }]
  });

  assert.equal(totals.subtotal, 64);
  assert.equal(totals.tax, 9.6);
  assert.equal(totals.total, 73.6);
  assert.equal(invoice.total, 73.6);
  assert.equal(invoice.paid, 73.6);
  assert.equal(invoice.due, 0);
  assert.equal(invoice.status, 'paid');
});

test('invoice discount is allocated proportionally before VAT', () => {
  const totals = computeTotals([
    { productId: 'a', qty: 1, price: 100, taxRate: 15 },
    { productId: 'b', qty: 1, price: 50, taxRate: 15 }
  ], { discount: 30 });

  assert.equal(totals.subtotal, 150);
  assert.equal(totals.discount, 30);
  assert.equal(totals.tax, 18);
  assert.equal(totals.total, 138);
  assert.equal(totals.lines[0].taxable, 80);
  assert.equal(totals.lines[1].taxable, 40);
});

test('service charge and delivery fee are taxed at the standard rate', () => {
  const totals = computeTotals([
    { productId: 'a', qty: 1, price: 100, taxRate: 15 }
  ], { serviceCharge: 10, deliveryFee: 5 });

  assert.equal(totals.extras, 15);
  assert.equal(totals.extrasTax, 2.25);
  assert.equal(totals.tax, 17.25);
  assert.equal(totals.total, 132.25);
});

test('cash overpayment produces change and caps the recorded payment', () => {
  const { payments, paid, change } = normalizePayments([{ method: 'cash', amount: 100 }], 73.6);
  assert.equal(paid, 73.6);
  assert.equal(change, 26.4);
  assert.deepEqual(payments, [{ method: 'cash', amount: 73.6 }]);
});

test('overpayment can be rejected explicitly', () => {
  assert.throws(
    () => normalizePayments([{ method: 'cash', amount: 100 }], 73.6, { allowOverpay: false }),
    /PAYMENT_EXCEEDS_TOTAL/
  );
});

test('mixed payments are marked as mixed and split correctly', () => {
  const { invoice } = createSaleDraft({
    items: [{ productId: 'm1', qty: 1, price: 100, taxRate: 15 }],
    payments: [
      { method: 'cash', amount: 50 },
      { method: 'mada', amount: 65 }
    ]
  });
  assert.equal(invoice.method, 'mixed');
  assert.equal(invoice.total, 115);
  assert.equal(invoice.paid, 115);
  assert.equal(invoice.payments.length, 2);
});

test('credit sale requires a registered customer', () => {
  assert.throws(() => createSaleDraft({
    items: [{ productId: 'm1', qty: 1, price: 100, taxRate: 15 }],
    payments: [{ method: 'cash', amount: 50 }]
  }), /CREDIT_REQUIRES_CUSTOMER/);
});

test('credit sale posts the remainder to receivables', () => {
  const { invoice } = createSaleDraft({
    items: [{ productId: 'm1', qty: 1, price: 100, taxRate: 15 }],
    payments: [{ method: 'cash', amount: 50 }],
    customer: { id: 'c1', name: 'شركة الواحة', vatNumber: '310123456700003' }
  });
  assert.equal(invoice.due, 65);
  assert.equal(invoice.status, 'partial');
  assert.equal(invoice.customerId, 'c1');
});

test('sale computes cost of goods and profit', () => {
  const { invoice } = createSaleDraft({
    items: [{ productId: 'm1', qty: 3, price: 20, cost: 7, taxRate: 15 }],
    payments: [{ method: 'cash', amount: 69 }]
  });
  assert.equal(invoice.cogs, 21);
  assert.equal(invoice.profit, 39);
});

test('empty sales and invalid quantities are rejected', () => {
  assert.throws(() => createSaleDraft({ items: [] }), /SALE_EMPTY/);
  assert.throws(() => createSaleDraft({
    items: [{ productId: 'm1', qty: 0, price: 10 }]
  }), /INVALID_QTY/);
});

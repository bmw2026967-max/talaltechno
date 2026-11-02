import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaleDraft } from '../src/sale.js';
import { createReturnDraft } from '../src/returns.js';

const original = createSaleDraft({
  id: 'inv_1',
  number: 'TT-1001',
  date: '2026-10-27',
  createdAt: '2026-10-27T10:00:00.000Z',
  items: [
    { productId: 'm1', name: 'كبسة دجاج', qty: 2, price: 32, cost: 10.85, taxRate: 15 },
    { productId: 'm2', name: 'عصير ليمون', qty: 1, price: 10, cost: 2.5, taxRate: 15 }
  ],
  payments: [{ method: 'mada', amount: 85.1 }],
  customer: { id: 'c1', name: 'شركة الواحة', vatNumber: '310123456700003' },
  orderType: 'dine_in',
  tableName: 'T01',
  branchId: 'b1',
  shiftId: 's1',
  cashierName: 'أحمد'
}).invoice;

test('full return restores the original total and cost', () => {
  const ret = createReturnDraft({
    original,
    items: [{ productId: 'm1', qty: 2 }, { productId: 'm2', qty: 1 }],
    number: 'RET-1001'
  });

  assert.equal(ret.type, 'return');
  assert.equal(ret.total, original.total);
  assert.equal(ret.subtotal, original.subtotal);
  assert.equal(ret.tax, original.tax);
  assert.equal(ret.cogs, original.cogs);
  assert.equal(ret.profit, -original.profit);
  assert.equal(ret.refundMethod, 'credit');
  assert.equal(ret.originalNumber, 'TT-1001');
  assert.equal(ret.orderType, 'dine_in');
  assert.equal(ret.tableName, 'T01');
  assert.equal(ret.shiftId, 's1');
});

test('partial return only refunds the returned quantity', () => {
  const ret = createReturnDraft({
    original,
    items: [{ productId: 'm1', qty: 1 }],
    number: 'RET-1002'
  });

  assert.equal(ret.subtotal, 32);
  assert.equal(ret.tax, 4.8);
  assert.equal(ret.total, 36.8);
  assert.equal(ret.cogs, 10.85);
});

test('return quantity cannot exceed the sold quantity', () => {
  assert.throws(() => createReturnDraft({
    original,
    items: [{ productId: 'm1', qty: 3 }]
  }), /RETURN_QTY_EXCEEDS_SOLD/);
});

test('unknown product and zero quantity are rejected', () => {
  assert.throws(() => createReturnDraft({
    original,
    items: [{ productId: 'nope', qty: 1 }]
  }), /RETURN_LINE_NOT_FOUND/);

  assert.throws(() => createReturnDraft({
    original,
    items: [{ productId: 'm1', qty: 0 }]
  }), /RETURN_QTY_INVALID/);
});

test('cash refund is available for walk-in sales', () => {
  const cashSale = createSaleDraft({
    items: [{ productId: 'm1', name: 'كبسة', qty: 1, price: 32, cost: 10.85, taxRate: 15 }],
    payments: [{ method: 'cash', amount: 36.8 }]
  }).invoice;

  const ret = createReturnDraft({
    original: cashSale,
    items: [{ productId: 'm1', qty: 1 }]
  });
  assert.equal(ret.refundMethod, 'cash');
  assert.equal(ret.customerId, null);
});

test('credit refund requires a registered customer', () => {
  const cashSale = createSaleDraft({
    items: [{ productId: 'm1', name: 'كبسة', qty: 1, price: 32, cost: 10.85, taxRate: 15 }],
    payments: [{ method: 'cash', amount: 36.8 }]
  }).invoice;

  assert.throws(() => createReturnDraft({
    original: cashSale,
    items: [{ productId: 'm1', qty: 1 }],
    refundMethod: 'credit'
  }), /CREDIT_REFUND_REQUIRES_CUSTOMER/);
});

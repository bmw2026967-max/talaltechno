import test from 'node:test';
import assert from 'node:assert/strict';
import { openShift, summarizeShift, closeShift } from '../src/shift.js';

const invoices = [
  {
    id: 'i1',
    type: 'sale',
    shiftId: 's1',
    total: 115,
    tax: 15,
    discount: 0,
    payments: [{ method: 'cash', amount: 65 }, { method: 'mada', amount: 50 }]
  },
  {
    id: 'i2',
    type: 'sale',
    shiftId: 's1',
    total: 23,
    tax: 3,
    discount: 0,
    payments: [{ method: 'cash', amount: 23 }]
  },
  {
    id: 'r1',
    type: 'return',
    shiftId: 's1',
    total: 11.5,
    tax: 1.5,
    payments: [{ method: 'cash', amount: 11.5 }]
  }
];

const expenses = [
  { id: 'e1', shiftId: 's1', method: 'cash', amount: 10 },
  { id: 'e2', shiftId: 's1', method: 'bank', amount: 40 }
];

test('openShift validates opening cash and user', () => {
  const shift = openShift({ id: 's1', number: 'SH-1', branchId: 'b1', userId: 'u1', userName: 'أحمد', openingCash: 500 });
  assert.equal(shift.status, 'open');
  assert.equal(shift.openingCash, 500);
  assert.throws(() => openShift({ userId: 'u1', openingCash: -1 }), /OPENING_CASH_NEGATIVE/);
  assert.throws(() => openShift({ openingCash: 100 }), /SHIFT_USER_REQUIRED/);
});

test('shift summary reconciles cash, returns and expenses', () => {
  const shift = openShift({ id: 's1', userId: 'u1', openingCash: 500 });
  const summary = summarizeShift(shift, invoices, expenses);

  assert.equal(summary.sales, 138);
  assert.equal(summary.refunds, 11.5);
  assert.equal(summary.tax, 18);
  assert.equal(summary.count, 2);
  assert.equal(summary.avgTicket, 69);
  assert.equal(summary.byMethod.cash, 76.5);
  assert.equal(summary.byMethod.mada, 50);
  assert.equal(summary.cashExpenses, 10);
  assert.equal(summary.expectedCash, 566.5);
});

test('closing a shift records variance without blocking the close', () => {
  const shift = openShift({ id: 's1', userId: 'u1', openingCash: 500 });
  const closed = closeShift(shift, 560, invoices, expenses);

  assert.equal(closed.status, 'closed');
  assert.equal(closed.expectedCash, 566.5);
  assert.equal(closed.closingCash, 560);
  assert.equal(closed.variance, -6.5);
  assert.equal(closed.orders, 2);
  assert.equal(closed.sales, 138);
  assert.ok(closed.closedAt);
});

test('closing an already closed shift is rejected', () => {
  const shift = openShift({ id: 's1', userId: 'u1', openingCash: 500 });
  const closed = closeShift(shift, 500, [], []);
  assert.throws(() => closeShift(closed, 500, [], []), /SHIFT_ALREADY_CLOSED/);
});

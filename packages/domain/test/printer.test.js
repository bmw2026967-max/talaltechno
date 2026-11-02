import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReceipt,
  buildKitchenTicket,
  toEscPos,
  stripControlBytes,
  MockTransport,
  printReceipt,
  printKitchen,
  COMMAND
} from '../src/printer.js';
import { makeSale } from './helpers.js';

const settings = {
  store: { name: 'مطعم طلال تكنو', branch: 'العليا — الرياض', vatNumber: '310123456700003', phone: '0112345678' },
  printer: { name: 'Talal Techno Mock Printer' },
  footer: 'شكراً لزيارتكم'
};

test('receipt contains store, items, totals and ZATCA QR', () => {
  const invoice = makeSale();
  invoice.zatca = { qr: 'QUJDREVGRw==' };
  const text = buildReceipt(invoice, settings);

  assert.match(text, /مطعم طلال تكنو/);
  assert.match(text, /الرقم الضريبي: 310123456700003/);
  assert.match(text, /TT-9001/);
  assert.match(text, /كبسة دجاج/);
  assert.match(text, /الإجمالي/);
  assert.match(text, /73\.60/);
  assert.match(text, /QUJDREVGRw==/);
  assert.match(text, /فاتورة تجريبية — Sandbox/);
});

test('receipt prints payment method and change is not a payment line', () => {
  const invoice = makeSale({ payments: [{ method: 'cash', amount: 100 }] });
  const text = buildReceipt(invoice, settings);
  assert.match(text, /نقدي/);
  assert.match(text, /73\.60/);
  assert.doesNotMatch(text, /المتبقي/);
});

test('kitchen ticket lists items, table and notes', () => {
  const text = buildKitchenTicket({
    number: 'ORD-1',
    createdAt: '2026-10-27T10:00:00Z',
    orderType: 'dine_in',
    tableName: 'T05',
    platformName: 'Jahez',
    notes: 'بدون بصل',
    items: [{ qty: 2, name: 'كبسة دجاج', notes: 'حار' }, { qty: 1, name: 'مياه' }]
  }, settings);

  assert.match(text, /طلب مطبخ/);
  assert.match(text, /ORD-1/);
  assert.match(text, /الطاولة: T05/);
  assert.match(text, /Jahez/);
  assert.match(text, /2 × كبسة دجاج/);
  assert.match(text, /حار/);
  assert.match(text, /بدون بصل/);
});

test('ESC/POS stream starts with init and ends with cut', () => {
  const buffer = toEscPos('hello', { drawer: true });
  assert.equal(buffer[0], 0x1b);
  assert.equal(buffer[1], 0x40);
  assert.ok(buffer.includes(Buffer.from(COMMAND.DRAWER)));
  assert.ok(buffer.subarray(-4).equals(Buffer.from(COMMAND.CUT)));
});

test('control bytes are stripped for previews', () => {
  const buffer = toEscPos('فاتورة تجريبية', { drawer: true });
  const text = stripControlBytes(buffer);
  assert.equal(text.includes('\u001b'), false);
  assert.match(text, /فاتورة تجريبية/);
});

test('mock transport records receipt and kitchen jobs without hardware', () => {
  const transport = new MockTransport();
  const invoice = makeSale();
  const receipt = printReceipt(invoice, settings, transport);
  const kitchen = printKitchen({ number: 'ORD-2', items: [{ qty: 1, name: 'كبسة' }] }, settings, transport);

  assert.equal(transport.jobs.length, 2);
  assert.equal(receipt.kind, 'receipt');
  assert.equal(receipt.number, 'TT-9001');
  assert.equal(kitchen.kind, 'kitchen');
  assert.equal(transport.last().number, 'ORD-2');
  assert.ok(receipt.bytes > 100);
  assert.match(receipt.text, /مطعم طلال تكنو/);
});

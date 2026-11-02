/**
 * ESC/POS thermal-printer builder (mock).
 *
 * The output is a real byte stream (Buffer) with standard ESC/POS commands, so
 * it can be replayed against a physical printer later. The package ships no
 * driver: `MockTransport` records jobs in memory and never touches hardware.
 */

import { round2 } from './money.js';

export const ESC = 0x1b;
export const GS = 0x1d;

export const COMMAND = Object.freeze({
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_ON: [GS, 0x21, 0x11],
  DOUBLE_OFF: [GS, 0x21, 0x00],
  FEED: [0x0a],
  CUT: [GS, 0x56, 0x42, 0x00],
  DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa]
});

const encoder = new TextEncoder();

/**
 * Encode Arabic text for a real printer. ESC/POS code pages differ per device;
 * this mock keeps UTF-8 (the browser demo does the same) and documents the
 * limitation instead of pretending to support a specific code page.
 */
export const encodeText = (value) => encoder.encode(String(value == null ? '' : value));

export const money = (value) => round2(value).toFixed(2);

const dateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return String(value || '');
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const line = (text = '') => `${text}\n`;
const divider = (width = 32, char = '-') => `${char.repeat(width)}\n`;
const center = (text, width = 32) => {
  const value = String(text == null ? '' : text);
  const pad = Math.max(0, Math.floor((width - value.length) / 2));
  return `${' '.repeat(pad)}${value}\n`;
};

const twoCols = (left, right, width = 32) => {
  const l = String(left == null ? '' : left);
  const r = String(right == null ? '' : right);
  const space = Math.max(1, width - l.length - r.length);
  return `${l}${' '.repeat(space)}${r}\n`;
};

export const PAYMENT_LABELS = Object.freeze({
  cash: 'نقدي',
  mada: 'مدى',
  applepay: 'Apple Pay',
  stcpay: 'STC Pay',
  visa: 'Visa',
  mastercard: 'Mastercard',
  card: 'شبكة',
  bank: 'تحويل',
  credit: 'آجل',
  wallet: 'محفظة',
  mixed: 'مختلط'
});

export const methodLabel = (method) => PAYMENT_LABELS[method] || method || '';

export function buildReceipt(invoice, settings = {}) {
  if (!invoice) throw new Error('INVOICE_REQUIRED');
  const width = Number(settings.width) || 32;
  const store = settings.store || {};
  const rows = [];

  rows.push(center(store.name || 'طلال تكنو', width));
  if (store.branch) rows.push(center(store.branch, width));
  if (store.vatNumber) rows.push(center(`الرقم الضريبي: ${store.vatNumber}`, width));
  if (store.phone) rows.push(center(store.phone, width));
  rows.push(divider(width));

  rows.push(line(`فاتورة: ${invoice.number}`));
  rows.push(line(`التاريخ: ${dateTime(invoice.createdAt || invoice.date)}`));
  if (invoice.cashierName) rows.push(line(`الكاشير: ${invoice.cashierName}`));
  if (invoice.orderType) rows.push(line(`نوع الطلب: ${orderTypeLabel(invoice.orderType)}`));
  if (invoice.tableName) rows.push(line(`الطاولة: ${invoice.tableName}`));
  if (invoice.orderNumber) rows.push(line(`الطلب: ${invoice.orderNumber}`));
  rows.push(divider(width));

  (invoice.items || []).forEach((item) => {
    rows.push(line(item.name || ''));
    rows.push(twoCols(`  ${item.qty} × ${money(item.price)}`, money((Number(item.qty) || 0) * (Number(item.price) || 0)), width));
  });

  rows.push(divider(width));
  rows.push(twoCols('المجموع', money(invoice.subtotal), width));
  if (Number(invoice.discount) > 0) rows.push(twoCols('الخصم', `-${money(invoice.discount)}`, width));
  if (Number(invoice.serviceCharge) > 0) rows.push(twoCols('خدمة', money(invoice.serviceCharge), width));
  if (Number(invoice.deliveryFee) > 0) rows.push(twoCols('توصيل', money(invoice.deliveryFee), width));
  rows.push(twoCols('الضريبة 15%', money(invoice.tax), width));
  rows.push(twoCols('الإجمالي', money(invoice.total), width));
  rows.push(divider(width));

  (invoice.payments || []).forEach((payment) => {
    rows.push(twoCols(methodLabel(payment.method), money(payment.amount), width));
  });
  if (Number(invoice.due) > 0.01) rows.push(twoCols('المتبقي', money(invoice.due), width));

  if (invoice.zatca && invoice.zatca.qr) {
    rows.push(divider(width));
    rows.push(center('رمز QR الضريبي', width));
    rows.push(line(invoice.zatca.qr));
  }
  rows.push(divider(width));
  rows.push(center(settings.footer || 'شكراً لزيارتكم — طلال تكنو', width));
  rows.push(center('فاتورة تجريبية — Sandbox', width));
  rows.push(line());

  return rows.join('');
}

export function buildKitchenTicket(order, settings = {}) {
  if (!order) throw new Error('ORDER_REQUIRED');
  const width = Number(settings.width) || 32;
  const rows = [];
  rows.push(center('طلب مطبخ', width));
  rows.push(divider(width));
  rows.push(line(`الطلب: ${order.number || ''}`));
  rows.push(line(`الوقت: ${dateTime(order.createdAt)}`));
  if (order.orderType) rows.push(line(`النوع: ${orderTypeLabel(order.orderType)}`));
  if (order.tableName) rows.push(line(`الطاولة: ${order.tableName}`));
  if (order.platformName) rows.push(line(`المنصة: ${order.platformName}`));
  if (order.notes) rows.push(line(`ملاحظات: ${order.notes}`));
  rows.push(divider(width));
  (order.items || []).forEach((item) => {
    rows.push(line(`${item.qty} × ${item.name}`));
    if (item.notes) rows.push(line(`   ${item.notes}`));
  });
  rows.push(divider(width));
  rows.push(line());
  return rows.join('');
}

export function orderTypeLabel(type) {
  return ({
    dine_in: 'محلي',
    takeaway: 'سفري',
    delivery: 'توصيل',
    curbside: 'استلام سيارة'
  })[type] || type || '';
}

/**
 * Convert a ticket text into an ESC/POS byte stream.
 */
export function toEscPos(text, opts = {}) {
  const chunks = [];
  const push = (bytes) => chunks.push(Buffer.from(bytes));
  push(COMMAND.INIT);
  if (opts.drawer) push(COMMAND.DRAWER);
  push(COMMAND.ALIGN_RIGHT);
  push(encodeText(text));
  push(COMMAND.FEED);
  push(COMMAND.FEED);
  push(COMMAND.CUT);
  return Buffer.concat(chunks);
}

/**
 * Remove ESC/POS control bytes so a ticket can be previewed in HTML.
 */
export function stripControlBytes(buffer) {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  const out = [];
  for (let i = 0; i < input.length; i += 1) {
    const byte = input[i];
    if (byte === ESC) {
      const next = input[i + 1];
      if (next === 0x40) { i += 1; continue; }
      if (next === 0x61 || next === 0x45) { i += 2; continue; }
      if (next === 0x70) { i += 4; continue; }
      continue;
    }
    if (byte === GS) {
      const next = input[i + 1];
      if (next === 0x21) { i += 2; continue; }
      if (next === 0x56) { i += 3; continue; }
      continue;
    }
    out.push(byte);
  }
  return Buffer.from(out).toString('utf8');
}

/**
 * In-memory transport used by tests and the browser demo. A production adapter
 * would implement the same `send` contract over USB/Bluetooth/network.
 */
export class MockTransport {
  constructor() {
    this.jobs = [];
  }

  send(bytes, meta = {}) {
    const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
    const job = {
      id: meta.id || `job_${this.jobs.length + 1}`,
      kind: meta.kind || 'receipt',
      number: meta.number || '',
      printer: meta.printer || 'Talal Techno Mock Printer',
      bytes: buffer.length,
      payload: buffer,
      text: stripControlBytes(buffer),
      createdAt: new Date().toISOString()
    };
    this.jobs.unshift(job);
    return job;
  }

  last() {
    return this.jobs[0] || null;
  }
}

export function printReceipt(invoice, settings = {}, transport = new MockTransport()) {
  const text = buildReceipt(invoice, settings);
  const payload = toEscPos(text, { drawer: settings.openDrawer });
  return transport.send(payload, {
    kind: 'receipt',
    number: invoice.number,
    printer: (settings.printer && settings.printer.name) || settings.printerName
  });
}

export function printKitchen(order, settings = {}, transport = new MockTransport()) {
  const text = buildKitchenTicket(order, settings);
  const payload = toEscPos(text);
  return transport.send(payload, {
    kind: 'kitchen',
    number: order.number,
    printer: (settings.kitchenPrinter && settings.kitchenPrinter.name) || settings.printerName
  });
}

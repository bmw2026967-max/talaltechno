import test from 'node:test';
import assert from 'node:assert/strict';
import {
  qrPayload,
  qrBase64,
  decodeQr,
  issueSandbox,
  buildUblXml,
  verifyChain,
  reportSandbox,
  sha256,
  ZATCA_WARNING
} from '../src/zatca.js';
import { makeSale, makeZatcaInvoice } from './helpers.js';

test('TLV QR round-trips the five ZATCA fields', () => {
  const payload = qrPayload({
    sellerName: 'مطعم طلال تكنو',
    vatNumber: '310123456700003',
    timestamp: '2026-10-27T10:00:00Z',
    total: 73.6,
    tax: 9.6
  });
  const decoded = decodeQr(qrBase64(payload));

  assert.equal(decoded.sellerName, 'مطعم طلال تكنو');
  assert.equal(decoded.vatNumber, '310123456700003');
  assert.equal(decoded.timestamp, '2026-10-27T10:00:00Z');
  assert.equal(decoded.total, 73.6);
  assert.equal(decoded.tax, 9.6);
});

test('sandbox issuance produces a hash, QR, signature and UBL XML', () => {
  const invoice = makeSale();
  invoice.seller = { name: 'مطعم طلال تكنو', vatNumber: '310123456700003', crNumber: '1010123456' };
  const meta = issueSandbox(invoice);

  assert.equal(meta.environment, 'sandbox');
  assert.equal(meta.warning, ZATCA_WARNING);
  assert.equal(meta.invoiceHash.length, 64);
  assert.equal(meta.previousHash, '0'.repeat(64));
  assert.ok(meta.qr.length > 20);
  assert.ok(meta.signature.startsWith('TU9DSy1FQ0RTQ'));
  assert.match(meta.xml, /<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/);
  assert.match(meta.xml, /<cbc:ProfileID>reporting:1\.0<\/cbc:ProfileID>/);
  assert.match(meta.xml, /<cbc:InvoiceTypeCode name="0200000">388<\/cbc:InvoiceTypeCode>/);
  assert.match(meta.xml, /<cbc:ID>PIH<\/cbc:ID>/);
  assert.match(meta.xml, /<cbc:EmbeddedDocumentBinaryObject mimeCode="text\/plain">/);
  assert.equal(meta.status, 'REPORTED');
});

test('standard invoices use clearance profile and buyer VAT', () => {
  const invoice = makeSale({ customer: { id: 'c1', name: 'شركة الواحة', vatNumber: '311111111100003' } });
  invoice.seller = { name: 'مطعم طلال تكنو', vatNumber: '310123456700003' };
  invoice.customer = { name: 'شركة الواحة', vatNumber: '311111111100003' };
  const meta = issueSandbox(invoice);
  assert.equal(meta.type, 'standard');
  assert.match(meta.xml, /<cbc:ProfileID>clearance:1\.0<\/cbc:ProfileID>/);
  assert.match(meta.xml, /<cbc:InvoiceTypeCode name="0100000">388<\/cbc:InvoiceTypeCode>/);
  assert.match(meta.xml, /311111111100003/);
});

test('credit notes reference the original invoice and use type 381', () => {
  const invoice = makeSale();
  invoice.type = 'return';
  invoice.originalNumber = 'TT-9001';
  invoice.seller = { name: 'مطعم طلال تكنو', vatNumber: '310123456700003' };
  const meta = issueSandbox(invoice);
  assert.match(meta.xml, /<cbc:InvoiceTypeCode name="0200000">381<\/cbc:InvoiceTypeCode>/);
  assert.match(meta.xml, /<cac:BillingReference>/);
  assert.match(meta.xml, /TT-9001/);
});

test('hash chain links sequential invoices and stays valid', () => {
  const first = makeZatcaInvoice('TT-9001');
  const second = makeZatcaInvoice('TT-9002', first.zatca.invoiceHash, '2026-10-27T10:05:00.000Z');
  const third = makeZatcaInvoice('TT-9003', second.zatca.invoiceHash, '2026-10-27T10:10:00.000Z');

  const result = verifyChain([third, first, second]);
  assert.equal(result.valid, true);
  assert.equal(result.checked, 3);
  assert.equal(result.lastHash, third.zatca.invoiceHash);
  assert.equal(second.zatca.previousHash, first.zatca.invoiceHash);
});

test('tampering with an invoice hash is detected', () => {
  const first = makeZatcaInvoice('TT-9001');
  const second = makeZatcaInvoice('TT-9002', first.zatca.invoiceHash, '2026-10-27T10:05:00.000Z');
  const third = makeZatcaInvoice('TT-9003', second.zatca.invoiceHash, '2026-10-27T10:10:00.000Z');
  second.zatca.invoiceHash = sha256('tampered');

  const result = verifyChain([first, second, third]);
  assert.equal(result.valid, false);
  assert.equal(result.tampered.length, 1);
  assert.equal(result.broken.length, 1);
  assert.equal(result.broken[0].invoice, 'TT-9003');
});

test('sandbox reporting can move an invoice to pending or rejected', () => {
  const invoice = makeZatcaInvoice('TT-9001');
  const pending = reportSandbox(invoice.zatca, 'PENDING');
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.reportedAt, null);
  assert.match(pending.warning, /Sandbox/);
  assert.throws(() => reportSandbox(invoice.zatca, 'CERTIFIED'), /ZATCA_STATUS_INVALID/);
});

test('UBL XML escapes seller and buyer text', () => {
  const invoice = makeSale({ customerName: 'شركة <الواحة> & شركاه' });
  invoice.seller = { name: 'مطعم "طلال"', vatNumber: '310123456700003' };
  const xml = buildUblXml(invoice, { uuid: 'u-1', qr: 'qr', previousHash: '0'.repeat(64) });
  assert.match(xml, /&lt;الواحة&gt; &amp; شركاه/);
  assert.match(xml, /&quot;طلال&quot;/);
});

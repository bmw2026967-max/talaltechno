/**
 * ZATCA Phase-2 sandbox engine.
 *
 * This module intentionally implements only the parts that can be exercised
 * without a production CSID: TLV QR generation, UBL 2.1 XML, a SHA-256 hash
 * chain and a clearly-labelled MOCK ECDSA signature. It is NOT certified by
 * ZATCA and must never be used to issue real tax invoices.
 */

import { createHash, randomUUID } from 'node:crypto';
import { round2 } from './money.js';

export const ZATCA_ENVIRONMENT = 'sandbox';
export const ZATCA_WARNING = 'بيئة تجريبية Sandbox — غير معتمدة من هيئة الزكاة والضريبة والجمارك.';

export const sha256 = (value) => createHash('sha256').update(String(value), 'utf8').digest('hex');

const utf8 = (value) => Buffer.from(String(value == null ? '' : value), 'utf8');

export function tlv(tag, value) {
  const body = utf8(value);
  if (body.length > 255) throw new Error('TLV_FIELD_TOO_LONG');
  return Buffer.concat([Buffer.from([tag, body.length]), body]);
}

export function qrPayload({ sellerName, vatNumber, timestamp, total, tax }) {
  return {
    sellerName: sellerName || '',
    vatNumber: vatNumber || '',
    timestamp: timestamp || new Date().toISOString(),
    total: round2(total),
    tax: round2(tax)
  };
}

export function qrBase64(payload) {
  return Buffer.concat([
    tlv(1, payload.sellerName),
    tlv(2, payload.vatNumber),
    tlv(3, payload.timestamp),
    tlv(4, round2(payload.total).toFixed(2)),
    tlv(5, round2(payload.tax).toFixed(2))
  ]).toString('base64');
}

export function decodeQr(base64) {
  const buffer = Buffer.from(String(base64 || ''), 'base64');
  const fields = {};
  let offset = 0;
  while (offset < buffer.length) {
    const tag = buffer[offset];
    const length = buffer[offset + 1];
    if (length === undefined) throw new Error('QR_TRUNCATED');
    const value = buffer.subarray(offset + 2, offset + 2 + length).toString('utf8');
    fields[tag] = value;
    offset += 2 + length;
  }
  return {
    sellerName: fields[1] || '',
    vatNumber: fields[2] || '',
    timestamp: fields[3] || '',
    total: Number(fields[4] || 0),
    tax: Number(fields[5] || 0)
  };
}

const xmlEsc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const dateOf = (value) => String(value || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
const timeOf = (value) => {
  const text = String(value || '');
  const match = text.match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : '00:00:00';
};

export function invoiceType(invoice) {
  const customer = invoice && invoice.customer;
  if (customer && (customer.taxNumber || customer.vatNumber)) return 'standard';
  if (invoice && (invoice.customerTaxNumber || invoice.buyerVatNumber)) return 'standard';
  return 'simplified';
}

export function buildHashInput(invoice, meta) {
  const sellerVat = meta.sellerVatNumber || invoice.sellerVatNumber || '';
  return [
    invoice.number || '',
    dateOf(invoice.date),
    timeOf(meta.timestamp || invoice.createdAt),
    sellerVat,
    invoice.customerName || '',
    round2(invoice.total).toFixed(2),
    round2(invoice.tax).toFixed(2),
    meta.previousHash || '0'.repeat(64),
    meta.qr || ''
  ].join('|');
}

export function mockSignature(hash, secret = 'sandbox') {
  // Deliberately not a valid ECDSA signature. A real integration must use a
  // ZATCA-issued CSID and secp256k1/SHA-256 signing on the server.
  return Buffer.from(`MOCK-ECDSA-SECP256K1:${sha256(`${hash}|${secret}`)}`, 'utf8').toString('base64');
}

export function buildUblXml(invoice, meta = {}) {
  const type = meta.type || invoiceType(invoice);
  const typeCode = invoice.type === 'return' ? '381' : '388';
  const subtype = type === 'standard' ? '0100000' : '0200000';
  const profile = type === 'standard' ? 'clearance:1.0' : 'reporting:1.0';
  const seller = invoice.seller || {};
  const buyer = invoice.buyer || invoice.customer || {};
  const lines = invoice.items || [];
  const taxRate = Number(invoice.taxRate) || 15;

  const xmlLines = lines.map((line, index) => {
    const lineNet = round2(line.net !== undefined ? line.net : line.qty * line.price);
    const lineTax = round2(line.taxAmount !== undefined ? line.taxAmount : lineNet * (Number(line.taxRate) || taxRate) / 100);
    return `  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${xmlEsc(line.unit || 'PCE')}">${Number(line.qty).toFixed(2)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${lineNet.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${lineTax.toFixed(2)}</cbc:TaxAmount></cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${xmlEsc(line.name)}</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${Number(line.taxRate || taxRate).toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="SAR">${round2(line.price).toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
  }).join('\n');

  const billingReference = invoice.type === 'return' && invoice.originalNumber
    ? `  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${xmlEsc(invoice.originalNumber)}</cbc:ID><cbc:DocumentTypeCode>388</cbc:DocumentTypeCode></cac:InvoiceDocumentReference></cac:BillingReference>\n`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>${profile}</cbc:ProfileID>
  <cbc:ID>${xmlEsc(invoice.number)}</cbc:ID>
  <cbc:UUID>${xmlEsc(meta.uuid || invoice.uuid || '')}</cbc:UUID>
  <cbc:IssueDate>${dateOf(invoice.date)}</cbc:IssueDate>
  <cbc:IssueTime>${timeOf(meta.timestamp || invoice.createdAt)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subtype}">${typeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cbc:Note>${xmlEsc(invoice.notes || 'فاتورة تجريبية — Sandbox')}</cbc:Note>
${billingReference}  <cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEsc(meta.previousHash || '')}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEsc(meta.qr || '')}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyIdentification><cbc:ID schemeID="CRN">${xmlEsc(seller.crNumber || '')}</cbc:ID></cac:PartyIdentification>
    <cac:PostalAddress><cbc:StreetName>${xmlEsc(seller.address || '')}</cbc:StreetName><cbc:CityName>${xmlEsc(seller.city || 'الرياض')}</cbc:CityName><cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(seller.vatNumber || '')}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(seller.name || '')}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(buyer.vatNumber || '')}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(buyer.name || invoice.customerName || 'عميل نقدي')}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${round2(invoice.tax).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="SAR">${round2(invoice.subtotal).toFixed(2)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="SAR">${round2(invoice.tax).toFixed(2)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${taxRate.toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${round2(invoice.subtotal).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${round2(invoice.subtotal - (invoice.discount || 0)).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${round2(invoice.total).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="SAR">${round2(invoice.discount).toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="SAR">${round2(invoice.total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${xmlLines}
</Invoice>`;
}

export function issueSandbox(invoice, opts = {}) {
  if (!invoice) throw new Error('INVOICE_REQUIRED');
  const timestamp = opts.timestamp || invoice.createdAt || new Date().toISOString();
  const previousHash = opts.previousHash || '0'.repeat(64);
  const uuid = opts.uuid || randomUUID();
  const type = opts.type || invoiceType(invoice);
  const seller = invoice.seller || {};
  const payload = qrPayload({
    sellerName: seller.name || invoice.sellerName || '',
    vatNumber: seller.vatNumber || invoice.sellerVatNumber || '',
    timestamp,
    total: invoice.total,
    tax: invoice.tax
  });
  const qr = qrBase64(payload);
  const hashInput = buildHashInput(invoice, {
    timestamp,
    previousHash,
    qr,
    sellerVatNumber: seller.vatNumber || invoice.sellerVatNumber || ''
  });
  const invoiceHash = sha256(hashInput);
  const signature = mockSignature(invoiceHash, opts.secret || seller.vatNumber || 'sandbox');
  const meta = {
    uuid,
    type,
    invoiceHash,
    previousHash,
    qr,
    qrPayload: payload,
    signature,
    hashInput,
    environment: ZATCA_ENVIRONMENT,
    issuedAt: timestamp,
    status: opts.status || (type === 'standard' ? 'CLEARED' : 'REPORTED'),
    reportedAt: opts.status === 'PENDING' ? null : new Date().toISOString(),
    warning: ZATCA_WARNING
  };
  meta.xml = buildUblXml(invoice, meta);
  return meta;
}

export function verifyChain(invoices) {
  const rows = (invoices || [])
    .filter((invoice) => invoice && invoice.zatca && invoice.zatca.invoiceHash)
    .slice()
    .sort((a, b) => String(a.zatca.issuedAt || a.createdAt || '').localeCompare(String(b.zatca.issuedAt || b.createdAt || '')));

  const broken = [];
  const tampered = [];
  let previous = '0'.repeat(64);
  rows.forEach((invoice) => {
    const zatca = invoice.zatca;
    if (zatca.previousHash !== previous) {
      broken.push({ invoice: invoice.number, expected: previous, found: zatca.previousHash });
    }
    if (zatca.hashInput && sha256(zatca.hashInput) !== zatca.invoiceHash) {
      tampered.push({ invoice: invoice.number, expected: sha256(zatca.hashInput), found: zatca.invoiceHash });
    }
    previous = zatca.invoiceHash;
  });

  return {
    valid: broken.length === 0 && tampered.length === 0,
    checked: rows.length,
    broken,
    tampered,
    lastHash: previous,
    invoices: rows
  };
}

export function reportSandbox(zatca, status = 'REPORTED') {
  if (!zatca) throw new Error('ZATCA_RECORD_REQUIRED');
  if (!['REPORTED', 'CLEARED', 'PENDING', 'REJECTED'].includes(status)) throw new Error('ZATCA_STATUS_INVALID');
  return {
    ...zatca,
    status,
    reportedAt: status === 'PENDING' ? null : new Date().toISOString(),
    warning: status === 'CLEARED'
      ? 'مطابقة تجريبية Sandbox فقط — ليست اعتماداً رسمياً.'
      : 'إبلاغ تجريبي Sandbox فقط — لا يُعد إبلاغاً رسمياً.'
  };
}

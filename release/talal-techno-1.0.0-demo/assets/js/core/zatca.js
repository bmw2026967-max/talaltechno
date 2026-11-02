/* ==========================================================================
   طلال تكنو — ZATCA Phase 2 sandbox engine
   UBL 2.1 XML, TLV QR, SHA-256 hash chain, mock ECDSA signature,
   reporting / clearance simulation and chain verification.

   IMPORTANT: This is a sandbox/mock implementation for development and
   demonstration. It is NOT ZATCA-certified and must not be used to file
   real tax invoices. Production use requires a real CSID, a certified
   signing service and ZATCA onboarding.
   ========================================================================== */
(function () {
  'use strict';
  const Z = window.Zatca = {};
  const round2 = U.round2;
  const today = () => U.today();
  const settings = () => Store.data.settings;
  const zsettings = () => Store.data.settings.zatca || {};

  /* ------------------------------------------------------------------
     SHA-256 (synchronous, UTF-8) — used for invoice hashes and the chain
     ------------------------------------------------------------------ */
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8Bytes(str) {
    const s = String(str == null ? '' : str);
    const out = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        const c2 = s.charCodeAt(i + 1);
        if (c2 >= 0xdc00 && c2 <= 0xdfff) {
          c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
          i++;
        }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function sha256Bytes(bytes) {
    const msg = bytes.slice();
    const bitLen = msg.length * 8;
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    const hi = Math.floor(bitLen / 0x100000000);
    const lo = bitLen >>> 0;
    msg.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255);
    msg.push((lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;

    for (let off = 0; off < msg.length; off += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) {
        w[i] = ((msg[off + i * 4] << 24) | (msg[off + i * 4 + 1] << 16) |
          (msg[off + i * 4 + 2] << 8) | msg[off + i * 4 + 3]) >>> 0;
      }
      for (let i = 16; i < 64; i++) {
        const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
        const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        const ch = ((e & f) ^ ((~e) & g)) >>> 0;
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map((n) => ('00000000' + n.toString(16)).slice(-8)).join('');
  }

  function sha256(str) { return sha256Bytes(utf8Bytes(str)); }
  Z.sha256 = sha256;

  function b64Bytes(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
      out += chars[b0 >> 2];
      out += chars[((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4)];
      out += b1 === undefined ? '=' : chars[((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6)];
      out += b2 === undefined ? '=' : chars[b2 & 63];
    }
    return out;
  }
  function b64utf8(str) { return b64Bytes(utf8Bytes(str)); }
  Z.base64 = b64utf8;

  function xmlEsc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  Z.xmlEsc = xmlEsc;

  function isoNow(d) {
    const dt = d ? new Date(d) : new Date();
    return dt.toISOString();
  }
  function dateOf(value) {
    if (!value) return today();
    return String(value).slice(0, 10);
  }
  function timeOf(value) {
    const dt = value ? new Date(value) : new Date();
    if (isNaN(dt.getTime())) return '12:00:00';
    return dt.toISOString().slice(11, 19);
  }

  /* ------------------------------------------------------------------
     TLV QR — ZATCA tags 1..5
     ------------------------------------------------------------------ */
  Z.tlv = function (fields) {
    const parts = [];
    const add = (tag, value) => {
      const bytes = utf8Bytes(value == null ? '' : value);
      parts.push(tag & 255, bytes.length & 255);
      bytes.forEach((b) => parts.push(b));
    };
    add(1, fields.sellerName || '');
    add(2, fields.vatNumber || '');
    add(3, fields.timestamp || isoNow());
    add(4, Number(fields.total || 0).toFixed(2));
    add(5, Number(fields.tax || 0).toFixed(2));
    return b64Bytes(parts);
  };

  Z.qrPayload = function (invoice, opts) {
    const o = opts || {};
    const s = settings();
    return {
      sellerName: s.company || 'طلال تكنو',
      vatNumber: s.taxNumber || '',
      timestamp: o.timestamp || invoice.createdAt || isoNow(),
      total: round2(invoice.total || 0),
      tax: round2(invoice.tax || 0)
    };
  };

  Z.qrBase64 = function (invoice, opts) {
    return Z.tlv(Z.qrPayload(invoice, opts));
  };

  Z.qrSvg = function (text, size) {
    try {
      if (typeof qrcode !== 'function') return '';
      const qr = qrcode(0, 'M');
      qr.addData(String(text || ''));
      qr.make();
      const px = size || 180;
      return qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true })
        .replace('<svg', `<svg width="${px}" height="${px}"`);
    } catch (e) {
      return '';
    }
  };

  /* ------------------------------------------------------------------
     UBL 2.1 builder (Saudi profile, sandbox)
     ------------------------------------------------------------------ */
  function sellerParty() {
    const s = settings();
    return `<cac:AccountingSupplierParty><cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${xmlEsc(s.commercialRegister || '')}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress><cbc:StreetName>${xmlEsc(s.address || '')}</cbc:StreetName><cbc:CityName>الرياض</cbc:CityName><cbc:CountrySubentity>SA-01</cbc:CountrySubentity><cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(s.taxNumber || '')}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(s.legalName || s.company || '')}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party></cac:AccountingSupplierParty>`;
  }

  function customerParty(invoice, type) {
    const c = invoice.customerId ? Store.customer(invoice.customerId) : null;
    const name = (c && c.name) || invoice.customerName || 'عميل نقدي';
    const vat = (c && (c.taxNumber || c.vatNumber)) || '';
    const address = (c && c.address) || 'الرياض';
    return `<cac:AccountingCustomerParty><cac:Party>
      <cac:PostalAddress><cbc:StreetName>${xmlEsc(address)}</cbc:StreetName><cbc:CityName>الرياض</cbc:CityName><cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
      ${vat ? `<cac:PartyTaxScheme><cbc:CompanyID>${xmlEsc(vat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      <cac:PartyLegalEntity><cbc:RegistrationName>${xmlEsc(name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party></cac:AccountingCustomerParty>`;
  }

  function taxSubtotal(taxable, tax, rate) {
    return `<cac:TaxSubtotal><cbc:TaxableAmount currencyID="SAR">${round2(taxable).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${round2(tax).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID schemeID="UN/ECE 5305">S</cbc:ID><cbc:Percent>${Number(rate || 0).toFixed(2)}</cbc:Percent>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`;
  }

  Z.buildUbl = function (invoice, meta) {
    const m = meta || {};
    const s = settings();
    const type = m.type || Z.invoiceType(invoice);
    const isReturn = invoice.type === 'return';
    const typeCode = isReturn ? '381' : '388';
    const subtype = type === 'standard' ? '0100000' : '0200000';
    const profile = type === 'standard' ? 'clearance:1.0' : 'reporting:1.0';
    const date = dateOf(invoice.date);
    const time = timeOf(invoice.createdAt);
    const lines = (invoice.items || []).map((it, idx) => {
      const qty = Number(it.qty) || 0;
      const price = Number(it.price) || 0;
      const lineNet = round2(qty * price - (Number(it.discount) || 0));
      const lineTax = round2(lineNet * (Number(it.taxRate) || 0) / 100);
      return `<cac:InvoiceLine><cbc:ID>${idx + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${qty}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${lineNet.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${lineTax.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxSubtotal><cbc:TaxableAmount currencyID="SAR">${lineNet.toFixed(2)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="SAR">${lineTax.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory><cbc:ID schemeID="UN/ECE 5305">S</cbc:ID><cbc:Percent>${Number(it.taxRate || 0).toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item><cbc:Name>${xmlEsc(it.name)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${Number(it.taxRate || 0).toFixed(2)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
        <cac:Price><cbc:PriceAmount currencyID="SAR">${price.toFixed(2)}</cbc:PriceAmount></cac:Price>
      </cac:InvoiceLine>`;
    }).join('');

    const taxable = round2(invoice.subtotal - invoice.discount);
    const tax = round2(invoice.tax || 0);
    const total = round2(invoice.total || 0);
    const qr = m.qr || invoice.zatca && invoice.zatca.qr || '';
    const previous = m.previousHash || '0'.repeat(64);
    const invoiceHash = m.invoiceHash || '';
    const signature = m.signature || '';
    const uuid = m.uuid || (invoice.zatca && invoice.zatca.uuid) || U.uid('uuid');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>${profile}</cbc:ProfileID>
  <cbc:ID>${xmlEsc(invoice.number)}</cbc:ID>
  <cbc:UUID>${xmlEsc(uuid)}</cbc:UUID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subtype}">${typeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cbc:Note>${xmlEsc(s.invoiceTerms || 'فاتورة إلكترونية — بيئة تجريبية Sandbox')}</cbc:Note>
  ${invoice.orderNumber ? `<cac:OrderReference><cbc:ID>${xmlEsc(invoice.orderNumber)}</cbc:ID></cac:OrderReference>` : ''}
  ${isReturn && invoice.originalNumber ? `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${xmlEsc(invoice.originalNumber)}</cbc:ID><cbc:DocumentTypeCode>388</cbc:DocumentTypeCode></cac:InvoiceDocumentReference></cac:BillingReference>` : ''}
  <cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${previous}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEsc(qr)}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference><cbc:ID>SIG</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${xmlEsc(signature)}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  ${sellerParty()}
  ${customerParty(invoice, type)}
  <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${tax.toFixed(2)}</cbc:TaxAmount>${taxSubtotal(taxable, tax, s.vatRate)}</cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${round2(invoice.subtotal).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${taxable.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="SAR">${round2(invoice.discount || 0).toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="SAR">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</Invoice>`;
  };

  /* ------------------------------------------------------------------
     Invoice type & issue
     ------------------------------------------------------------------ */
  Z.invoiceType = function (invoice) {
    const c = invoice && invoice.customerId ? Store.customer(invoice.customerId) : null;
    if (c && (c.taxNumber || c.vatNumber)) return 'standard';
    if (invoice && invoice.customerTaxNumber) return 'standard';
    return 'simplified';
  };
  Z.typeLabel = (t) => (t === 'standard' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة');
  Z.statusLabel = (s) => ({
    PENDING: 'بانتظار الإبلاغ', QUEUED: 'في قائمة الإرسال', REPORTED: 'تم الإبلاغ',
    CLEARED: 'تمت المطابقة', REJECTED: 'مرفوضة', FAILED: 'فشل الإرسال'
  }[s] || s || '—');

  function mockSign(hash, secret) {
    // Sandbox simulation only. ZATCA requires SHA256withECDSA over secp256k1
    // with a real CSID; this deterministic token is not a valid signature.
    return b64utf8('MOCK-ECDSA-SECP256K1:' + sha256(hash + '|' + (secret || 'sandbox')));
  }
  Z.mockSign = mockSign;

  Z.issue = function (invoice, opts) {
    const o = opts || {};
    if (!invoice) throw new Error('الفاتورة غير موجودة.');
    const s = settings();
    const z = s.zatca || (s.zatca = {});
    const type = o.type || Z.invoiceType(invoice);
    const timestamp = o.timestamp || invoice.createdAt || isoNow();
    const previousHash = o.previousHash || z.lastHash || '0'.repeat(64);
    const qrPayload = Z.qrPayload(invoice, { timestamp });
    const qr = Z.tlv(qrPayload);
    const uuid = o.uuid || U.uid('uuid');
    const hashInput = [
      invoice.number || '', dateOf(invoice.date), timeOf(timestamp), s.taxNumber || '',
      invoice.customerName || '', Number(invoice.total || 0).toFixed(2),
      Number(invoice.tax || 0).toFixed(2), previousHash, qr
    ].join('|');
    const invoiceHash = sha256(hashInput);
    const signature = mockSign(invoiceHash, z.serialNumber || z.commonName || 'sandbox');
    const meta = {
      uuid, type, invoiceHash, previousHash, qr, qrPayload, signature, hashInput,
      environment: z.environment || 'sandbox',
      issuedAt: timestamp
    };
    const xml = Z.buildUbl(invoice, meta);
    const status = o.status || (type === 'standard'
      ? (z.autoReport ? 'CLEARED' : 'PENDING')
      : (z.autoReport ? 'REPORTED' : 'PENDING'));
    invoice.zatca = Object.assign({}, meta, {
      xml, status,
      reportedAt: status === 'REPORTED' || status === 'CLEARED' ? isoNow() : null,
      warning: 'بيئة تجريبية Sandbox — غير معتمدة من ZATCA'
    });
    invoice.invoiceHash = invoiceHash;
    invoice.previousHash = previousHash;
    invoice.qrCode = qr;
    z.lastHash = invoiceHash;
    z.invoiceCounter = (Number(z.invoiceCounter) || 0) + 1;
    const log = {
      id: U.uid('ztc'), invoiceId: invoice.id, invoiceNumber: invoice.number,
      type, status, invoiceHash, previousHash, qr, environment: meta.environment,
      at: isoNow(), message: status === 'CLEARED' ? 'مطابقة تجريبية (Sandbox)' : status === 'REPORTED' ? 'إبلاغ تجريبي (Sandbox)' : 'بانتظار الإرسال'
    };
    Store.data.zatcaLogs.unshift(log);
    if (Store.data.zatcaLogs.length > 500) Store.data.zatcaLogs.length = 500;
    if (!o.silent) Store.save();
    return invoice.zatca;
  };

  Z.report = function (invoiceId) {
    const invoice = Store.invoice(invoiceId);
    if (!invoice || !invoice.zatca) throw new Error('الفاتورة لا تحتوي على بيانات ZATCA.');
    if (invoice.zatca.status === 'CLEARED') throw new Error('الفاتورة تمت مطابقتها بالفعل.');
    invoice.zatca.status = 'REPORTED';
    invoice.zatca.reportedAt = isoNow();
    invoice.zatca.warning = 'تم الإبلاغ في بيئة Sandbox فقط.';
    Store.data.zatcaLogs.unshift({
      id: U.uid('ztc'), invoiceId, invoiceNumber: invoice.number, type: invoice.zatca.type,
      status: 'REPORTED', invoiceHash: invoice.zatca.invoiceHash, previousHash: invoice.zatca.previousHash,
      qr: invoice.zatca.qr, environment: invoice.zatca.environment, at: isoNow(),
      message: 'إبلاغ تجريبي ناجح — لا يُعد إبلاغاً رسمياً'
    });
    Store.audit('إبلاغ ZATCA تجريبي', `${invoice.number} — Sandbox`, 'file');
    Store.save();
    return invoice.zatca;
  };

  Z.clear = function (invoiceId) {
    const invoice = Store.invoice(invoiceId);
    if (!invoice || !invoice.zatca) throw new Error('الفاتورة لا تحتوي على بيانات ZATCA.');
    if (invoice.zatca.type !== 'standard') throw new Error('المطابقة (Clearance) للفواتير الضريبية القياسية فقط.');
    invoice.zatca.status = 'CLEARED';
    invoice.zatca.reportedAt = isoNow();
    invoice.zatca.warning = 'تمت المطابقة في بيئة Sandbox فقط.';
    Store.data.zatcaLogs.unshift({
      id: U.uid('ztc'), invoiceId, invoiceNumber: invoice.number, type: 'standard',
      status: 'CLEARED', invoiceHash: invoice.zatca.invoiceHash, previousHash: invoice.zatca.previousHash,
      qr: invoice.zatca.qr, environment: invoice.zatca.environment, at: isoNow(),
      message: 'مطابقة تجريبية ناجحة — لا تُعد اعتماداً رسمياً'
    });
    Store.audit('مطابقة ZATCA تجريبية', `${invoice.number} — Sandbox`, 'checkCircle');
    Store.save();
    return invoice.zatca;
  };

  Z.retry = function (invoiceId) {
    const invoice = Store.invoice(invoiceId);
    if (!invoice || !invoice.zatca) throw new Error('الفاتورة لا تحتوي على بيانات ZATCA.');
    invoice.zatca.status = 'QUEUED';
    Store.data.zatcaLogs.unshift({
      id: U.uid('ztc'), invoiceId, invoiceNumber: invoice.number, type: invoice.zatca.type,
      status: 'QUEUED', invoiceHash: invoice.zatca.invoiceHash, previousHash: invoice.zatca.previousHash,
      qr: invoice.zatca.qr, environment: invoice.zatca.environment, at: isoNow(),
      message: 'أُعيدت الفاتورة إلى قائمة الإرسال التجريبية'
    });
    Store.save();
    return invoice.zatca;
  };

  /* ------------------------------------------------------------------
     Chain verification & compliance
     ------------------------------------------------------------------ */
  Z.verifyChain = function () {
    const invoices = Store.data.invoices
      .filter((i) => i.zatca && i.zatca.invoiceHash)
      .slice()
      .sort((a, b) => String(a.zatca.issuedAt || a.createdAt).localeCompare(String(b.zatca.issuedAt || b.createdAt)));
    const broken = [];
    const tampered = [];
    let previous = '0'.repeat(64);
    invoices.forEach((inv) => {
      const z = inv.zatca;
      if (z.previousHash !== previous) {
        broken.push({ invoice: inv.number, expected: previous, found: z.previousHash });
      }
      if (z.hashInput && sha256(z.hashInput) !== z.invoiceHash) {
        tampered.push({ invoice: inv.number, expected: sha256(z.hashInput), found: z.invoiceHash });
      }
      previous = z.invoiceHash;
    });
    const last = invoices[invoices.length - 1];
    const storedLast = zsettings().lastHash || '';
    if (last && storedLast && last.zatca.invoiceHash !== storedLast) {
      broken.push({ invoice: last.number, expected: storedLast, found: last.zatca.invoiceHash, note: 'آخر تجزئة في الإعدادات لا تطابق آخر فاتورة' });
    }
    return {
      valid: broken.length === 0 && tampered.length === 0,
      checked: invoices.length, broken, tampered,
      lastHash: previous === '0'.repeat(64) ? storedLast : previous,
      invoices
    };
  };

  Z.compliance = function () {
    const z = zsettings();
    const invoices = Store.data.invoices.filter((i) => i.type === 'sale');
    const withZatca = invoices.filter((i) => i.zatca);
    const pending = withZatca.filter((i) => ['PENDING', 'QUEUED'].includes(i.zatca.status));
    const reported = withZatca.filter((i) => ['REPORTED', 'CLEARED'].includes(i.zatca.status));
    const chain = Z.verifyChain();
    return {
      environment: z.environment || 'sandbox',
      csidType: z.csidType || 'compliance',
      vatNumber: z.vatNumber || settings().taxNumber,
      invoices: invoices.length,
      withZatca: withZatca.length,
      pending: pending.length,
      reported: reported.length,
      chainValid: chain.valid,
      lastHash: chain.lastHash,
      counter: z.invoiceCounter || 0,
      checks: [
        { key: 'vat', label: 'الرقم الضريبي مسجل (15 رقماً)', ok: /^\d{15}$/.test(String(z.vatNumber || settings().taxNumber || '')) },
        { key: 'csid', label: 'بيانات CSID التجريبية مهيأة', ok: !!(z.serialNumber || z.commonName) },
        { key: 'hash', label: 'سلسلة التجزئة سليمة', ok: chain.valid },
        { key: 'qr', label: 'رموز QR مولدة لكل فاتورة', ok: withZatca.length === invoices.length },
        { key: 'sandbox', label: 'البيئة sandbox (غير معتمدة)', ok: (z.environment || 'sandbox') === 'sandbox' }
      ]
    };
  };

  Z.downloadXml = function (invoiceId) {
    const invoice = Store.invoice(invoiceId);
    if (!invoice || !invoice.zatca || !invoice.zatca.xml) throw new Error('لا يوجد XML لهذه الفاتورة.');
    const blob = new Blob([invoice.zatca.xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.number}-ZATCA-UBL.xml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  Z.exportLogs = function () {
    const rows = Store.data.zatcaLogs.map((l) => [
      l.invoiceNumber, l.type, l.status, l.environment, l.invoiceHash, l.previousHash, l.at
    ]);
    const csv = U.csv([
      ['الفاتورة', 'النوع', 'الحالة', 'البيئة', 'Hash', 'Previous Hash', 'التاريخ'],
      ...rows
    ]);
    U.download('zatca-sandbox-log.csv', csv, 'text/csv;charset=utf-8');
  };

  Z.seedSettings = function () {
    const s = settings();
    s.zatca = Object.assign({
      environment: 'sandbox', csidType: 'compliance',
      commonName: 'Talal Techno Sandbox CSID', serialNumber: 'TT-SANDBOX-0001',
      vatNumber: s.taxNumber || '310123456700003',
      autoReport: true, invoiceType: 'simplified', lastHash: '', invoiceCounter: 0
    }, s.zatca || {});
    return s.zatca;
  };

  Z.todayStats = function () {
    const list = Store.data.invoices.filter((i) => i.type === 'sale' && i.zatca && i.date === today());
    return {
      count: list.length,
      reported: list.filter((i) => ['REPORTED', 'CLEARED'].includes(i.zatca.status)).length,
      pending: list.filter((i) => ['PENDING', 'QUEUED'].includes(i.zatca.status)).length,
      tax: round2(U.sum(list, (i) => i.tax)),
      total: round2(U.sum(list, (i) => i.total))
    };
  };
})();

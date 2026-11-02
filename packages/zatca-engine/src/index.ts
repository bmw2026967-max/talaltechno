/**
 * ZATCA Phase-2 sandbox facade.
 *
 * ⚠️  NOT CERTIFIED. This package implements the development-time subset used
 * by the demo: TLV QR, UBL 2.1 XML, SHA-256 hash chain and a clearly-labelled
 * mock signature. Production onboarding requires a ZATCA-issued CSID, a real
 * ECDSA key pair and passing the official compliance test suite.
 */
import {
  ZATCA_ENVIRONMENT,
  ZATCA_WARNING,
  buildUblXml,
  decodeQr,
  issueSandbox,
  qrBase64,
  qrPayload,
  reportSandbox,
  sha256,
  tlv,
  verifyChain
} from '@talaltechno/domain';

export {
  ZATCA_ENVIRONMENT,
  ZATCA_WARNING,
  buildUblXml,
  decodeQr,
  issueSandbox,
  qrBase64,
  qrPayload,
  reportSandbox,
  sha256,
  tlv,
  verifyChain
};

export type ZatcaEnvironment = 'sandbox' | 'simulation' | 'production';

export interface ZatcaRuntimeConfig {
  environment: ZatcaEnvironment;
  vatNumber: string;
  commonName: string;
  serialNumber: string;
  hasPrivateKey: boolean;
  hasCertificate: boolean;
}

export function assertSandboxOnly(environment = process.env.ZATCA_ENVIRONMENT): void {
  if (environment === 'production') {
    throw new Error(
      'ZATCA_PRODUCTION_BLOCKED: this open-source build is sandbox-only. ' +
        'Use a certified integration and real CSID before issuing tax invoices.'
    );
  }
}

export function runtimeConfig(): ZatcaRuntimeConfig {
  return {
    environment: (process.env.ZATCA_ENVIRONMENT as ZatcaEnvironment) || 'sandbox',
    vatNumber: process.env.ZATCA_VAT_NUMBER || '',
    commonName: process.env.ZATCA_COMMON_NAME || 'Talal Techno Sandbox CSID',
    serialNumber: process.env.ZATCA_SERIAL_NUMBER || '1-Talal-Techno|2-Sandbox|3-0001',
    hasPrivateKey: Boolean(process.env.ZATCA_PRIVATE_KEY),
    hasCertificate: Boolean(process.env.ZATCA_CERTIFICATE)
  };
}

export function complianceChecklist(config = runtimeConfig()) {
  return [
    { key: 'sandbox', label: 'بيئة Sandbox وليس إنتاج', ok: config.environment !== 'production' },
    { key: 'vat', label: 'الرقم الضريبي مُعرّف', ok: /^3\d{13}3$/.test(config.vatNumber) },
    { key: 'csid', label: 'CSID تجريبي (اختياري للعرض)', ok: Boolean(process.env.ZATCA_CSID) },
    { key: 'key', label: 'مفتاح خاص (غير مطلوب في Mock)', ok: config.hasPrivateKey || config.environment === 'sandbox' },
    { key: 'certificate', label: 'شهادة (غير مطلوبة في Mock)', ok: config.hasCertificate || config.environment === 'sandbox' }
  ];
}

/**
 * @talaltechno/domain — public entry point.
 *
 * Dependency-free business logic shared by the NestJS API, the admin app, the
 * Flutter POS (via a JSON bridge) and the browser demo. Every function is pure
 * except the mock printer/sync transports, which are injected.
 */

export * from './money.js';
export * from './sale.js';
export * from './returns.js';
export * from './inventory.js';
export * from './journal.js';
export * from './shift.js';
export * from './zatca.js';
export * from './printer.js';
export * from './sync.js';

export const VERSION = '0.1.0';
export const BRAND = Object.freeze({
  name: 'طلال تكنو',
  nameEn: 'Talal Techno',
  tagline: 'TALAL TECHNO • CLOUD ERP + POS',
  currency: 'SAR',
  country: 'SA',
  locale: 'ar-SA'
});

export interface Payment {
  method: string;
  amount: number;
}

export interface SaleLineInput {
  id?: string;
  productId?: string;
  sku?: string;
  name?: string;
  type?: 'menu' | 'raw';
  categoryId?: string | null;
  qty: number;
  price: number;
  discount?: number;
  taxRate?: number;
  taxable?: boolean;
  cost?: number;
}

export interface SaleLine extends SaleLineInput {
  gross: number;
  net: number;
  taxAmount: number;
  total: number;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  serviceCharge: number;
  deliveryFee: number;
  extras: number;
  extrasTax: number;
  tax: number;
  total: number;
  lines: SaleLine[];
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  vatNumber?: string;
}

export interface Invoice {
  id: string;
  number: string;
  type: 'sale' | 'return';
  date: string;
  createdAt: string;
  customerId: string | null;
  customerName: string;
  items: SaleLine[];
  subtotal: number;
  discount: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paid: number;
  change?: number;
  due: number;
  payments: Payment[];
  method: string;
  status: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'curbside';
  tableId: string | null;
  tableName: string;
  orderId: string | null;
  orderNumber: string;
  cogs: number;
  profit: number;
  branchId: string | null;
  cashierId: string | null;
  cashierName: string;
  shiftId?: string | null;
  [key: string]: unknown;
}

export interface CreateSaleOptions {
  items: SaleLineInput[];
  payments?: Payment[];
  customer?: Customer | null;
  customerName?: string;
  customerPhone?: string;
  discount?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  taxRate?: number;
  orderType?: Invoice['orderType'];
  tableId?: string;
  tableName?: string;
  orderId?: string;
  orderNumber?: string;
  branchId?: string;
  cashierId?: string;
  cashierName?: string;
  shiftId?: string;
  notes?: string;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyPoints?: number;
  loyaltyDiscount?: number;
  source?: string;
  id?: string;
  number?: string;
  date?: string;
  createdAt?: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  cost: number;
  stock: number;
  minStock?: number;
}

export interface RecipeLine {
  materialId: string;
  qty: number;
}

export interface Product {
  id: string;
  name: string;
  type: 'menu' | 'raw';
  price?: number;
  recipe?: RecipeLine[];
}

export interface StockMove {
  materialId: string;
  productId?: string;
  qty: number;
  unitCost: number;
  value: number;
  type: string;
  referenceType: string;
  referenceId: string | null;
  referenceNumber: string;
  note: string;
}

export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  createdAt: string;
  description: string;
  sourceType: string;
  sourceId: string | null;
  sourceNumber: string;
  posted: boolean;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface Shift {
  id: string;
  number: string;
  branchId: string | null;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  status: 'open' | 'closed';
  notes: string;
}

export interface ShiftSummary {
  shift: Shift;
  invoices: Invoice[];
  returns: Invoice[];
  expenses: Array<{ amount: number; method?: string }>;
  byMethod: Record<string, number>;
  cashSales: number;
  cashExpenses: number;
  expectedCash: number;
  sales: number;
  tax: number;
  discounts: number;
  cogs: number;
  count: number;
  avgTicket: number;
  refunds: number;
}

export interface ZatcaMeta {
  uuid: string;
  type: 'standard' | 'simplified';
  invoiceHash: string;
  previousHash: string;
  qr: string;
  signature: string;
  hashInput?: string;
  environment: 'sandbox';
  issuedAt?: string;
  status: string;
  warning: string;
  xml?: string;
  reportedAt?: string | null;
}

export declare const VERSION: string;
export declare const BRAND: Readonly<Record<string, string>>;
export declare const DEFAULT_TAX_RATE: number;
export declare const ORDER_TYPES: Readonly<Record<string, string>>;
export declare const PAYMENT_METHODS: readonly string[];
export declare const ACCOUNTS: Readonly<Record<string, string>>;

export declare function round2(value: unknown): number;
export declare function sum<T>(list: T[], selector?: (row: T) => number): number;
export declare function clamp(value: unknown, min: number, max: number): number;
export declare function formatSAR(value: unknown, locale?: string): string;
export declare function percentOf(value: unknown, rate: unknown): number;

export declare function normalizeLine(item: SaleLineInput, index?: number, defaultTaxRate?: number): SaleLine;
export declare function normalizeLines(items: SaleLineInput[], taxRate?: number): SaleLine[];
export declare function computeTotals(lines: SaleLineInput[] | SaleLine[], opts?: { discount?: number; serviceCharge?: number; deliveryFee?: number; taxRate?: number }): SaleTotals;
export declare function normalizePayments(payments: Payment[] | undefined, total: number, opts?: { allowOverpay?: boolean }): { payments: Payment[]; paid: number; change: number; tendered: number };
export declare function deriveMethod(payments: Payment[], due: number): string;
export declare function createSaleDraft(opts: CreateSaleOptions): { invoice: Invoice; totals: SaleTotals; lines: SaleLine[] };

export declare function createReturnDraft(opts: { original: Invoice; items: Array<{ productId: string; qty: number }>; refundMethod?: string; id?: string; number?: string; date?: string; createdAt?: string; notes?: string; cashierId?: string; cashierName?: string }): Invoice;

export declare function recipeCost(recipe: RecipeLine[], materials: Record<string, Material>): number;
export declare function availableServings(recipe: RecipeLine[], materials: Record<string, Material>): number;
export declare function checkAvailability(items: Array<{ productId: string; qty: number }>, products: Record<string, Product>, materials: Record<string, Material>): true;
export declare function consume(items: Array<{ productId: string; qty: number }>, products: Record<string, Product>, materials: Record<string, Material>, ref?: { referenceType?: string; referenceId?: string | null; referenceNumber?: string }): { materials: Record<string, Material>; moves: StockMove[] };
export declare function restore(items: Array<{ productId: string; qty: number }>, products: Record<string, Product>, materials: Record<string, Material>, ref?: { referenceType?: string; referenceId?: string | null; referenceNumber?: string }): { materials: Record<string, Material>; moves: StockMove[] };
export declare function recordWaste(materials: Record<string, Material>, materialId: string, qty: number, reason?: string, ref?: { id?: string; number?: string }): { materials: Record<string, Material>; move: StockMove };
export declare function adjustStock(materials: Record<string, Material>, materialId: string, newQty: number, reason?: string, ref?: { id?: string; number?: string }): { materials: Record<string, Material>; move: StockMove };
export declare function valuation(materials: Record<string, Material>): number;

export declare function buildSaleJournal(invoice: Invoice): JournalEntry;
export declare function buildReturnJournal(ret: Invoice): JournalEntry;
export declare function assertBalanced(journal: JournalEntry, tolerance?: number): true;
export declare function trialBalance(entries: JournalEntry[]): { rows: Array<JournalLine & { balance: number }>; totalDebit: number; totalCredit: number; balanced: boolean };
export declare function incomeStatement(entries: JournalEntry[]): { revenue: number; returns: number; discounts: number; otherIncome: number; netSales: number; cogs: number; grossProfit: number };

export declare function openShift(opts: { id?: string; number?: string; branchId?: string; userId: string; userName?: string; openingCash: number; notes?: string; openedAt?: string }): Shift;
export declare function summarizeShift(shift: Shift, invoices?: Invoice[], expenses?: Array<{ amount: number; method?: string; shiftId?: string }>): ShiftSummary;
export declare function closeShift(shift: Shift, countedCash: number, invoices?: Invoice[], expenses?: Array<{ amount: number; method?: string; shiftId?: string }>): Shift & { sales: number; orders: number; byMethod: Record<string, number> };
export declare function methodLabel(method: string): string;

export declare const ZATCA_ENVIRONMENT: 'sandbox';
export declare const ZATCA_WARNING: string;
export declare function sha256(value: unknown): string;
export declare function tlv(tag: number, value: unknown): Buffer;
export declare function qrPayload(input: { sellerName?: string; vatNumber?: string; timestamp?: string; total?: number; tax?: number }): { sellerName: string; vatNumber: string; timestamp: string; total: number; tax: number };
export declare function qrBase64(payload: { sellerName: string; vatNumber: string; timestamp: string; total: number; tax: number }): string;
export declare function decodeQr(base64: string): { sellerName: string; vatNumber: string; timestamp: string; total: number; tax: number };
export declare function buildUblXml(invoice: Invoice, meta?: Partial<ZatcaMeta>): string;
export declare function issueSandbox(invoice: Invoice, opts?: { timestamp?: string; previousHash?: string; uuid?: string; type?: 'standard' | 'simplified'; secret?: string; status?: string }): ZatcaMeta;
export declare function verifyChain(invoices: Array<Invoice & { zatca?: ZatcaMeta }>): { valid: boolean; checked: number; broken: unknown[]; tampered: unknown[]; lastHash: string; invoices: unknown[] };
export declare function reportSandbox(zatca: ZatcaMeta, status?: 'REPORTED' | 'CLEARED' | 'PENDING' | 'REJECTED'): ZatcaMeta;

export declare function buildReceipt(invoice: Invoice, settings?: Record<string, unknown>): string;
export declare function buildKitchenTicket(order: Record<string, unknown>, settings?: Record<string, unknown>): string;
export declare function toEscPos(text: string, opts?: { drawer?: boolean }): Buffer;
export declare function stripControlBytes(buffer: Buffer | Uint8Array): string;
export declare class MockTransport {
  jobs: Array<{ id: string; kind: string; number: string; printer: string; bytes: number; payload: Buffer; text: string; createdAt: string }>;
  send(bytes: Buffer | Uint8Array, meta?: Record<string, string>): MockTransport['jobs'][number];
  last(): MockTransport['jobs'][number] | null;
}
export declare function printReceipt(invoice: Invoice, settings?: Record<string, unknown>, transport?: MockTransport): MockTransport['jobs'][number];
export declare function printKitchen(order: Record<string, unknown>, settings?: Record<string, unknown>, transport?: MockTransport): MockTransport['jobs'][number];

export interface SyncOperation {
  id: string;
  entity: string;
  type: string;
  entityId: string | null;
  payload: unknown;
  updatedAt: string;
  attempts: number;
  status: 'pending' | 'failed' | 'synced';
  error?: string;
}

export interface Outbox {
  ops: SyncOperation[];
  lastPushedAt: string | null;
  deviceId: string | null;
}

export declare function createOutbox(): Outbox;
export declare function enqueue(outbox: Outbox, op: Partial<SyncOperation> & { entity: string; type: string }): Outbox;
export declare function pendingCount(outbox: Outbox): number;
export declare function pushOutbox(outbox: Outbox, transport: { push: (ops: SyncOperation[]) => Promise<{ accepted?: string[] }> }, opts?: { batchSize?: number }): Promise<{ outbox: Outbox; pushed: number; failed: string | null; at: string }>;
export declare function mergeRemote<T extends { id: string; updatedAt?: string; deleted?: boolean; deletedAt?: string; entity?: string }>(localRows: T[], remoteRows: T[], opts?: { authoritative?: string[] }): { rows: T[]; applied: Array<{ id: string; action: string }>; conflicts: Array<{ id: string; winner: string }> };
export declare function resolveConflict<T>(local: T | null, remote: T | null): T | null;
export declare function syncStatus(outbox: Outbox, opts?: { online?: boolean }): { online: boolean; pending: number; failed: number; synced: number; total: number; lastPushedAt: string | null; deviceId: string | null };

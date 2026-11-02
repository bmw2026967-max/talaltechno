/**
 * Shared API contracts. Kept framework-free so the NestJS API, Next.js admin,
 * Flutter bridge and integration tests can all import the same shapes.
 */

export type Role =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'CASHIER'
  | 'WAITER'
  | 'KITCHEN'
  | 'ACCOUNTANT'
  | 'DELIVERY_MANAGER';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery' | 'curbside';
export type OrderStatus = 'new' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentMethod =
  | 'cash'
  | 'mada'
  | 'applepay'
  | 'stcpay'
  | 'visa'
  | 'mastercard'
  | 'card'
  | 'bank'
  | 'credit'
  | 'wallet'
  | 'mixed';

export type DeliveryPlatform = 'hungerstation' | 'jahez' | 'mrsool' | 'toyou' | 'careem' | 'direct';
export type IntegrationMode = 'mock' | 'sandbox' | 'production';
export type ZatcaStatus = 'PENDING' | 'REPORTED' | 'CLEARED' | 'REJECTED';

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    requestId?: string;
  };
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  requestId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  branchId: string | null;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface BranchDto {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  active: boolean;
}

export interface CategoryDto {
  id: string;
  name: string;
  nameEn?: string | null;
  sort: number;
  active: boolean;
}

export interface RecipeLineDto {
  materialId: string;
  qty: number;
}

export interface ProductDto {
  id: string;
  categoryId: string | null;
  name: string;
  nameEn?: string | null;
  sku: string;
  barcode?: string | null;
  type: 'menu' | 'raw';
  price: number;
  cost: number;
  taxRate: number;
  unit: string;
  emoji?: string | null;
  active: boolean;
  available: boolean;
  minStock: number;
  stock?: number;
  recipe?: RecipeLineDto[];
}

export interface TableDto {
  id: string;
  name: string;
  zone?: string | null;
  seats: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  qrToken: string;
}

export interface OrderItemDto {
  id?: string;
  productId?: string | null;
  name: string;
  qty: number;
  price: number;
  cost?: number;
  notes?: string | null;
  status?: OrderStatus;
  station?: string | null;
}

export interface OrderDto {
  id: string;
  number: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string | null;
  tableName?: string | null;
  platform?: DeliveryPlatform;
  platformName?: string | null;
  externalOrderId?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string | null;
  items: OrderItemDto[];
  createdAt: string;
}

export interface SaleItemInput {
  productId: string;
  qty: number;
  price?: number;
  discount?: number;
  notes?: string;
}

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  provider?: string;
}

export interface CreateSaleRequest {
  items: SaleItemInput[];
  payments?: PaymentInput[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discount?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  couponCode?: string;
  loyaltyPoints?: number;
  orderType?: OrderType;
  tableId?: string;
  orderId?: string;
  shiftId?: string;
  notes?: string;
  source?: 'pos' | 'qmenu' | 'delivery' | 'api';
}

export interface InvoiceItemDto {
  id: string;
  productId?: string | null;
  name: string;
  sku?: string | null;
  qty: number;
  price: number;
  discount: number;
  net: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  cost: number;
}

export interface InvoiceDto {
  id: string;
  number: string;
  type: 'sale' | 'return';
  status: 'paid' | 'partial' | 'unpaid' | 'returned';
  date: string;
  createdAt: string;
  customerId?: string | null;
  customerName: string;
  subtotal: number;
  discount: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  total: number;
  paid: number;
  change?: number;
  due: number;
  method: PaymentMethod;
  items: InvoiceItemDto[];
  payments: PaymentInput[];
  orderType?: OrderType;
  tableName?: string | null;
  cogs: number;
  profit: number;
  zatca?: ZatcaDto | null;
  originalInvoiceId?: string | null;
}

export interface ZatcaDto {
  uuid: string;
  type: 'standard' | 'simplified';
  invoiceHash: string;
  previousHash: string;
  qr: string;
  status: ZatcaStatus;
  environment: 'sandbox';
  issuedAt: string;
  warning: string;
}

export interface ShiftDto {
  id: string;
  number: string;
  status: 'open' | 'closed';
  userId: string;
  userName?: string;
  openingCash: number;
  closingCash?: number | null;
  expectedCash?: number | null;
  variance?: number | null;
  sales: number;
  orders: number;
  openedAt: string;
  closedAt?: string | null;
}

export interface ShiftSummaryDto {
  shiftId: string;
  sales: number;
  returns: number;
  tax: number;
  cogs: number;
  cashSales: number;
  expectedCash: number;
  byMethod: Record<string, number>;
  count: number;
}

export interface StockMoveDto {
  id: string;
  productId: string;
  productName?: string;
  type: 'opening' | 'purchase' | 'sale' | 'sale_return' | 'waste' | 'adjustment' | 'transfer_in' | 'transfer_out';
  qty: number;
  unitCost: number;
  value: number;
  referenceType?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface JournalLineDto {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntryDto {
  id: string;
  number: string;
  date: string;
  description: string;
  sourceType: string;
  sourceNumber?: string | null;
  lines: JournalLineDto[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface TrialBalanceDto {
  rows: Array<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

export interface PaymentChargeRequest {
  provider: 'hyperpay' | 'geidea' | 'moyasar' | 'paytabs';
  method: PaymentMethod;
  amount: number;
  currency?: 'SAR';
  invoiceId?: string;
  reference?: string;
}

export interface PaymentChargeResponse {
  transactionId: string;
  provider: string;
  method: PaymentMethod;
  amount: number;
  status: 'approved' | 'declined' | 'pending';
  mode: IntegrationMode;
  sandbox: true;
  message: string;
}

export interface DeliveryOrderDto {
  id: string;
  platform: DeliveryPlatform;
  platformName: string;
  externalOrderId: string;
  status: string;
  total: number;
  orderId?: string | null;
  createdAt: string;
}

export interface PrinterJobDto {
  id: string;
  kind: 'receipt' | 'kitchen' | 'test';
  number?: string | null;
  printer: string;
  bytes: number;
  preview: string;
  createdAt: string;
}

export interface SyncPushRequest {
  deviceId: string;
  operations: Array<{
    id: string;
    entity: string;
    type: 'create' | 'update' | 'delete';
    entityId?: string | null;
    payload: unknown;
    updatedAt: string;
  }>;
}

export interface SyncPushResponse {
  accepted: string[];
  rejected: Array<{ id: string; reason: string }>;
  serverTime: string;
}

export interface DashboardStatsDto {
  today: { sales: number; orders: number; avgTicket: number; tax: number };
  month: { sales: number; profit: number; cogs: number };
  openChecks: number;
  kitchenQueue: number;
  deliveryOrders: number;
  lowStock: Array<{ productId: string; name: string; stock: number; minStock: number; unit: string }>;
  zatca: { status: 'sandbox'; reported: number; pending: number; chainValid: boolean };
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
}

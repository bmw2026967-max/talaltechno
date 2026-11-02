export type PaymentProvider = 'hyperpay' | 'geidea' | 'moyasar' | 'paytabs';
export type DeliveryProvider = 'hungerstation' | 'jahez' | 'mrsool' | 'toyou' | 'careem';
export type IntegrationMode = 'mock' | 'sandbox' | 'production';

export interface PaymentChargeInput {
  amount: number;
  currency: 'SAR';
  method: string;
  invoiceId?: string;
  reference?: string;
}

export interface PaymentChargeResult {
  transactionId: string;
  provider: PaymentProvider;
  method: string;
  amount: number;
  status: 'approved' | 'declined' | 'pending';
  mode: IntegrationMode;
  sandbox: true;
  message: string;
}

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  readonly mode: IntegrationMode;
  charge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
}

export interface ExternalDeliveryOrder {
  externalOrderId: string;
  platform: DeliveryProvider;
  platformName: string;
  status: string;
  total: number;
  customerName: string;
  items: Array<{ name: string; qty: number; price: number; notes?: string }>;
  createdAt: string;
}

export interface DeliveryAdapter {
  readonly platform: DeliveryProvider;
  readonly mode: IntegrationMode;
  pullOrders(): Promise<ExternalDeliveryOrder[]>;
  updateStatus(externalOrderId: string, status: string): Promise<{ ok: boolean; status: string; message: string }>;
}

export const DELIVERY_NAMES: Record<DeliveryProvider, string> = {
  hungerstation: 'HungerStation',
  jahez: 'Jahez',
  mrsool: 'Mrsool',
  toyou: 'ToYou',
  careem: 'Careem'
};

export const PAYMENT_NAMES: Record<PaymentProvider, string> = {
  hyperpay: 'HyperPay',
  geidea: 'Geidea',
  moyasar: 'Moyasar',
  paytabs: 'PayTabs'
};

const id = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export class MockPaymentAdapter implements PaymentAdapter {
  readonly mode: IntegrationMode = 'mock';

  constructor(readonly provider: PaymentProvider) {}

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    if (!(input.amount > 0)) {
      return {
        transactionId: id('MOCK'),
        provider: this.provider,
        method: input.method,
        amount: input.amount,
        status: 'declined',
        mode: 'mock',
        sandbox: true,
        message: 'المبلغ غير صالح — محاكاة.'
      };
    }
    const declined = input.method === 'credit';
    return {
      transactionId: id('MOCK'),
      provider: this.provider,
      method: input.method,
      amount: Math.round(input.amount * 100) / 100,
      status: declined ? 'declined' : 'approved',
      mode: 'mock',
      sandbox: true,
      message: declined
        ? 'الدفع الآجل لا يمر عبر بوابة دفع — محاكاة.'
        : `دفعة تجريبية عبر ${PAYMENT_NAMES[this.provider]} — لم تُخصم أي مبالغ حقيقية.`
    };
  }
}

export class SandboxPaymentAdapter implements PaymentAdapter {
  readonly mode: IntegrationMode = 'sandbox';

  constructor(readonly provider: PaymentProvider) {}

  private credentials() {
    const map: Record<PaymentProvider, string[]> = {
      hyperpay: ['HYPERPAY_ENTITY_ID', 'HYPERPAY_ACCESS_TOKEN'],
      geidea: ['GEIDEA_MERCHANT_ID', 'GEIDEA_API_KEY'],
      moyasar: ['MOYASAR_PUBLIC_KEY', 'MOYASAR_SECRET_KEY'],
      paytabs: ['PAYTABS_PROFILE_ID', 'PAYTABS_SERVER_KEY']
    };
    const keys = map[this.provider];
    const configured = keys.every((key) => Boolean(process.env[key]));
    return { configured, keys };
  }

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    const { configured, keys } = this.credentials();
    if (!configured) {
      throw new Error(`PAYMENT_SANDBOX_NOT_CONFIGURED: ${this.provider} requires ${keys.join(', ')}.`);
    }
    return {
      transactionId: id('SBX'),
      provider: this.provider,
      method: input.method,
      amount: Math.round(input.amount * 100) / 100,
      status: 'approved',
      mode: 'sandbox',
      sandbox: true,
      message: `Sandbox ${PAYMENT_NAMES[this.provider]} — لم يتم إجراء أي اتصال شبكي في هذا العرض.`
    };
  }
}

export function createPaymentAdapter(provider: PaymentProvider, mode: IntegrationMode = 'mock'): PaymentAdapter {
  if (mode === 'sandbox') return new SandboxPaymentAdapter(provider);
  if (mode === 'production') {
    throw new Error('PAYMENT_PRODUCTION_BLOCKED: this build ships mock/sandbox adapters only.');
  }
  return new MockPaymentAdapter(provider);
}

export class MockDeliveryAdapter implements DeliveryAdapter {
  readonly mode: IntegrationMode = 'mock';

  constructor(readonly platform: DeliveryProvider) {}

  async pullOrders(): Promise<ExternalDeliveryOrder[]> {
    const names = DELIVERY_NAMES[this.platform];
    const now = new Date().toISOString();
    return [
      {
        externalOrderId: `${this.platform.toUpperCase()}-MOCK-${Math.floor(100000 + Math.random() * 899999)}`,
        platform: this.platform,
        platformName: names,
        status: 'new',
        total: 69,
        customerName: 'عميل تجريبي',
        items: [
          { name: 'كبسة دجاج', qty: 1, price: 32 },
          { name: 'مياه معدنية', qty: 2, price: 3 },
          { name: 'حمص بالطحينة', qty: 1, price: 18 }
        ],
        createdAt: now
      },
      {
        externalOrderId: `${this.platform.toUpperCase()}-MOCK-${Math.floor(100000 + Math.random() * 899999)}`,
        platform: this.platform,
        platformName: names,
        status: 'preparing',
        total: 55.2,
        customerName: 'نورة العتيبي',
        items: [{ name: 'مندي لحم', qty: 1, price: 48 }],
        createdAt: now
      }
    ];
  }

  async updateStatus(externalOrderId: string, status: string) {
    return {
      ok: true,
      status,
      message: `تم تحديث ${externalOrderId} إلى ${status} في محاكي ${DELIVERY_NAMES[this.platform]}.`
    };
  }
}

export class SandboxDeliveryAdapter implements DeliveryAdapter {
  readonly mode: IntegrationMode = 'sandbox';

  constructor(readonly platform: DeliveryProvider) {}

  private configured() {
    const map: Record<DeliveryProvider, string[]> = {
      hungerstation: ['HUNGERSTATION_CLIENT_ID', 'HUNGERSTATION_CLIENT_SECRET'],
      jahez: ['JAHEZ_CLIENT_ID', 'JAHEZ_CLIENT_SECRET'],
      mrsool: ['MRSOOL_API_KEY'],
      toyou: ['TOYOU_API_KEY'],
      careem: ['CAREEM_CLIENT_ID', 'CAREEM_CLIENT_SECRET']
    };
    return map[this.platform].every((key) => Boolean(process.env[key]));
  }

  async pullOrders(): Promise<ExternalDeliveryOrder[]> {
    if (!this.configured()) {
      throw new Error(`DELIVERY_SANDBOX_NOT_CONFIGURED: ${this.platform} credentials are missing.`);
    }
    return [];
  }

  async updateStatus(externalOrderId: string, status: string) {
    if (!this.configured()) {
      throw new Error(`DELIVERY_SANDBOX_NOT_CONFIGURED: ${this.platform} credentials are missing.`);
    }
    return { ok: true, status, message: `Sandbox ${DELIVERY_NAMES[this.platform]} — ${externalOrderId}.` };
  }
}

export function createDeliveryAdapter(platform: DeliveryProvider, mode: IntegrationMode = 'mock'): DeliveryAdapter {
  if (mode === 'sandbox') return new SandboxDeliveryAdapter(platform);
  if (mode === 'production') {
    throw new Error('DELIVERY_PRODUCTION_BLOCKED: this build ships mock/sandbox adapters only.');
  }
  return new MockDeliveryAdapter(platform);
}

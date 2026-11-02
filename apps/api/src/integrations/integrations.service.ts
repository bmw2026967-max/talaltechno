import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildReceipt, stripControlBytes, toEscPos } from '@talaltechno/domain';
import type { AuthUser } from '../common/types/auth-user';
import type { ChargeDto } from './dto/integration.dto';
import {
  DELIVERY_NAMES,
  PAYMENT_NAMES,
  createDeliveryAdapter,
  createPaymentAdapter,
  type DeliveryProvider,
  type IntegrationMode,
  type PaymentProvider
} from './adapters';

const num = (value: unknown) => Number(value || 0);

const METHOD_ENUM: Record<string, string> = {
  cash: 'CASH',
  mada: 'MADA',
  applepay: 'APPLE_PAY',
  stcpay: 'STC_PAY',
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  card: 'CARD',
  bank: 'BANK',
  credit: 'CREDIT',
  wallet: 'WALLET',
  mixed: 'MIXED'
};

const METHOD_FROM_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(METHOD_ENUM).map(([key, value]) => [value, key])
);

const modeFromEnv = (value: string | undefined, fallback: IntegrationMode = 'mock'): IntegrationMode => {
  const normalized = String(value || fallback).toLowerCase();
  if (normalized === 'sandbox') return 'sandbox';
  if (normalized === 'production') return 'production';
  return 'mock';
};

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const configs = await this.prisma.integrationConfig.findMany({
      where: { tenantId },
      orderBy: [{ kind: 'asc' }, { provider: 'asc' }]
    });
    return {
      data: {
        payments: {
          mode: modeFromEnv(process.env.PAYMENTS_MODE),
          providers: (Object.keys(PAYMENT_NAMES) as PaymentProvider[]).map((provider) => ({
            provider,
            name: PAYMENT_NAMES[provider],
            configured: configs.some((config) => config.kind === 'PAYMENT' && config.provider === provider && config.enabled)
          }))
        },
        delivery: {
          mode: modeFromEnv(process.env.DELIVERY_MODE),
          providers: (Object.keys(DELIVERY_NAMES) as DeliveryProvider[]).map((platform) => ({
            platform,
            name: DELIVERY_NAMES[platform],
            configured: configs.some((config) => config.kind === 'DELIVERY' && config.provider === platform && config.enabled)
          }))
        },
        printer: {
          mode: modeFromEnv(process.env.PRINTER_MODE),
          name: process.env.PRINTER_NAME || 'Talal Techno Mock Printer',
          width: Number(process.env.PRINTER_WIDTH || 32)
        },
        zatca: {
          environment: process.env.ZATCA_ENVIRONMENT || 'sandbox',
          certified: false
        },
        disclaimer: 'كل التكاملات تعمل Mock/Sandbox افتراضياً. لا توجد مفاتيح إنتاج ولا ادعاء باعتماد ZATCA أو مدى.'
      }
    };
  }

  async charge(user: AuthUser, dto: ChargeDto) {
    const mode = modeFromEnv(process.env.PAYMENTS_MODE);
    if (mode === 'production') {
      throw new BadRequestException('وضع الإنتاج غير مفعّل في هذه النسخة مفتوحة المصدر.');
    }
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({ where: { id: dto.invoiceId, tenantId: user.tenantId } });
      if (!invoice) throw new NotFoundException('الفاتورة غير موجودة.');
    }

    const adapter = createPaymentAdapter(dto.provider, mode);
    let result;
    try {
      result = await adapter.charge({
        amount: dto.amount,
        currency: 'SAR',
        method: dto.method,
        invoiceId: dto.invoiceId,
        reference: dto.reference
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'تعذر تنفيذ الدفع.');
    }

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        tenantId: user.tenantId,
        invoiceId: dto.invoiceId || null,
        provider: dto.provider,
        method: (METHOD_ENUM[dto.method] || 'CARD') as any,
        amount: dto.amount,
        status: result.status,
        transactionId: result.transactionId,
        reference: dto.reference || 'sandbox',
        mode: result.mode.toUpperCase() as any,
        raw: { sandbox: true, message: result.message, provider: dto.provider }
      }
    });

    return {
      data: {
        ...result,
        id: transaction.id,
        providerName: PAYMENT_NAMES[dto.provider]
      }
    };
  }

  async transactions(tenantId: string, limit = 50) {
    const rows = await this.prisma.paymentTransaction.findMany({
      where: { tenantId },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit))
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        providerName: PAYMENT_NAMES[row.provider as PaymentProvider] || row.provider,
        method: METHOD_FROM_ENUM[String(row.method)] || String(row.method).toLowerCase(),
        amount: num(row.amount),
        status: row.status,
        transactionId: row.transactionId,
        reference: row.reference,
        mode: String(row.mode).toLowerCase(),
        invoiceId: row.invoiceId,
        invoiceNumber: row.invoice?.number || null,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  async deliveryOrders(tenantId: string, platform?: string) {
    const rows = await this.prisma.deliveryOrder.findMany({
      where: {
        tenantId,
        ...(platform ? { platform: platform.toUpperCase() as any } : {})
      },
      include: { order: true, branch: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        platform: String(row.platform).toLowerCase(),
        platformName: DELIVERY_NAMES[String(row.platform).toLowerCase() as DeliveryProvider] || row.platform,
        externalOrderId: row.externalOrderId,
        status: row.status,
        total: num(row.total),
        orderId: row.orderId,
        orderNumber: row.order?.number || null,
        branchName: row.branch?.name || '',
        createdAt: row.createdAt.toISOString(),
        syncedAt: row.syncedAt ? row.syncedAt.toISOString() : null
      }))
    };
  }

  async pullDelivery(user: AuthUser, platform: DeliveryProvider) {
    const mode = modeFromEnv(process.env.DELIVERY_MODE);
    if (mode === 'production') {
      throw new BadRequestException('وضع الإنتاج غير مفعّل في هذه النسخة مفتوحة المصدر.');
    }
    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });
    if (!branch) throw new BadRequestException('لا يوجد فرع مهيّأ.');

    const adapter = createDeliveryAdapter(platform, mode);
    let orders;
    try {
      orders = await adapter.pullOrders();
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'تعذر جلب الطلبات.');
    }

    let imported = 0;
    for (const order of orders) {
      const existing = await this.prisma.deliveryOrder.findFirst({
        where: { tenantId: user.tenantId, platform: platform.toUpperCase() as any, externalOrderId: order.externalOrderId }
      });
      if (existing) continue;
      await this.prisma.deliveryOrder.create({
        data: {
          tenantId: user.tenantId,
          branchId: branch.id,
          platform: platform.toUpperCase() as any,
          externalOrderId: order.externalOrderId,
          status: order.status,
          total: order.total,
          payload: { ...order, sandbox: true },
          syncedAt: new Date()
        }
      });
      imported += 1;
    }

    return {
      data: {
        platform,
        platformName: DELIVERY_NAMES[platform],
        mode,
        fetched: orders.length,
        imported,
        skipped: orders.length - imported,
        orders
      }
    };
  }

  async updateDeliveryStatus(user: AuthUser, id: string, status: string) {
    const row = await this.prisma.deliveryOrder.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!row) throw new NotFoundException('طلب التوصيل غير موجود.');

    const platform = String(row.platform).toLowerCase() as DeliveryProvider;
    const adapter = createDeliveryAdapter(platform, modeFromEnv(process.env.DELIVERY_MODE));
    let result;
    try {
      result = await adapter.updateStatus(row.externalOrderId, status);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'تعذر تحديث حالة الطلب.');
    }

    const updated = await this.prisma.deliveryOrder.update({
      where: { id },
      data: { status, syncedAt: new Date() }
    });
    return {
      data: {
        id: updated.id,
        externalOrderId: updated.externalOrderId,
        status: updated.status,
        message: result.message
      }
    };
  }

  async printerTest(user: AuthUser) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });

    const invoice = {
      id: 'test',
      number: `TEST-${Date.now()}`,
      type: 'sale',
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      customerName: 'عميل تجريبي',
      items: [
        { name: 'كبسة دجاج', qty: 1, price: 32 },
        { name: 'مياه معدنية', qty: 2, price: 3 }
      ],
      subtotal: 38,
      discount: 0,
      serviceCharge: 0,
      deliveryFee: 0,
      tax: 5.7,
      total: 43.7,
      paid: 43.7,
      due: 0,
      payments: [{ method: 'cash', amount: 43.7 }],
      orderType: 'takeaway',
      zatca: { qr: 'TALAL-TECHNO-SANDBOX-QR' }
    };

    const settings = {
      store: {
        name: tenant?.name || 'طلال تكنو',
        branch: branch?.name || 'الفرع الرئيسي',
        vatNumber: tenant?.vatNumber || '',
        phone: tenant?.phone || ''
      },
      printer: { name: process.env.PRINTER_NAME || 'Talal Techno Mock Printer' },
      footer: 'شكراً لزيارتكم — طلال تكنو',
      width: Number(process.env.PRINTER_WIDTH || 32)
    };

    const text = buildReceipt(invoice as any, settings);
    const payload = toEscPos(text, { drawer: false });
    const preview = stripControlBytes(payload);
    const job = await this.prisma.printerJob.create({
      data: {
        tenantId: user.tenantId,
        branchId: branch?.id || null,
        kind: 'test',
        number: invoice.number,
        printer: settings.printer.name,
        bytes: payload.length,
        payload: preview,
        status: 'printed'
      }
    });

    return {
      data: {
        id: job.id,
        printer: settings.printer.name,
        mode: modeFromEnv(process.env.PRINTER_MODE),
        bytes: payload.length,
        preview,
        disclaimer: 'طباعة تجريبية Mock — لم يتم إرسال أي بيانات إلى طابعة حقيقية.'
      }
    };
  }

  async printerJobs(tenantId: string, limit = 50) {
    const rows = await this.prisma.printerJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit))
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        number: row.number,
        printer: row.printer,
        bytes: row.bytes,
        status: row.status,
        preview: row.payload,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildReturnJournal,
  buildSaleJournal,
  computeTotals,
  consume,
  createReturnDraft,
  createSaleDraft,
  issueSandbox,
  normalizeLines,
  recipeCost,
  restore
} from '@talaltechno/domain';
import type { AuthUser } from '../common/types/auth-user';
import type { CreateReturnDto, CreateSaleDto, SalePaymentDto } from './dto/sale.dto';

const num = (value: unknown) => Number(value || 0);
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dateOnly = (value: Date) => new Date(value.toISOString().slice(0, 10));

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

const TYPE_ENUM: Record<string, string> = {
  dine_in: 'DINE_IN',
  takeaway: 'TAKEAWAY',
  delivery: 'DELIVERY',
  curbside: 'CURBSIDE'
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, query: { from?: string; to?: string; type?: string; page: number; pageSize: number }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(200, Math.max(1, query.pageSize || 50));
    const where = {
      tenantId,
      ...(query.type ? { type: query.type.toUpperCase() as any } : {}),
      ...(query.from || query.to
        ? {
            date: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {})
            }
          }
        : {})
    };

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          items: true,
          payments: true,
          zatca: true,
          order: { include: { table: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.invoice.count({ where })
    ]);

    return {
      data: rows.map((row) => this.mapInvoice(row)),
      meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) }
    };
  }

  async get(tenantId: string, id: string) {
    const row = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        payments: true,
        zatca: true,
        returns: true,
        order: { include: { table: true } }
      }
    });
    if (!row) throw new NotFoundException('الفاتورة غير موجودة.');
    return { data: this.mapInvoice(row) };
  }

  private mapInvoice(row: any) {
    return {
      id: row.id,
      number: row.number,
      type: String(row.type).toLowerCase(),
      status: String(row.status).toLowerCase(),
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      subtotal: num(row.subtotal),
      discount: num(row.discount),
      serviceCharge: num(row.serviceCharge),
      deliveryFee: num(row.deliveryFee),
      tax: num(row.tax),
      total: num(row.total),
      paid: num(row.paid),
      due: num(row.due),
      method: METHOD_FROM_ENUM[String(row.method)] || String(row.method).toLowerCase(),
      items: (row.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        qty: num(item.qty),
        price: num(item.price),
        discount: num(item.discount),
        net: num(item.net),
        taxRate: num(item.taxRate),
        taxAmount: num(item.taxAmount),
        total: num(item.total),
        cost: num(item.cost)
      })),
      payments: (row.payments || []).map((payment: any) => ({
        method: METHOD_FROM_ENUM[String(payment.method)] || String(payment.method).toLowerCase(),
        amount: num(payment.amount),
        reference: payment.reference,
        provider: payment.provider,
        transactionId: payment.transactionId
      })),
      orderType: row.order ? String(row.order.type).toLowerCase() : ((row.snapshot as any)?.orderType || undefined),
      tableName: row.order?.table?.name || (row.snapshot as any)?.tableName || null,
      cogs: num(row.cogs),
      profit: num(row.profit),
      originalInvoiceId: row.originalInvoiceId,
      zatca: row.zatca
        ? {
            uuid: row.zatca.uuid,
            type: row.zatca.type,
            invoiceHash: row.zatca.invoiceHash,
            previousHash: row.zatca.previousHash,
            qr: row.zatca.qr,
            status: row.zatca.status,
            environment: row.zatca.environment,
            issuedAt: row.zatca.issuedAt,
            warning: row.zatca.warning
          }
        : null
    };
  }

  private async context(user: AuthUser) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant) throw new NotFoundException('المنشأة غير موجودة.');
    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });
    if (!branch) throw new BadRequestException('لا يوجد فرع مهيّأ.');
    const warehouse = await this.prisma.warehouse.findFirst({ where: { tenantId: user.tenantId, branchId: branch.id } });
    if (!warehouse) throw new BadRequestException('لا يوجد مخزن مهيّأ للفرع.');
    return { tenant, branch, warehouse };
  }

  private async stockContext(tenantId: string, warehouseId: string, productIds: string[]) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds }, active: true },
      include: { recipe: true }
    });
    const rawProducts = await this.prisma.product.findMany({
      where: { tenantId, type: 'RAW' },
      include: { stockLevels: { where: { warehouseId } } }
    });
    const materials: Record<string, { id: string; name: string; unit: string; cost: number; stock: number }> = {};
    rawProducts.forEach((product) => {
      materials[product.id] = {
        id: product.id,
        name: product.name,
        unit: product.unit,
        cost: num(product.cost),
        stock: num(product.stockLevels[0]?.qty)
      };
    });
    const domainProducts: Record<string, any> = {};
    products.forEach((product) => {
      domainProducts[product.id] = {
        id: product.id,
        name: product.name,
        type: product.type === 'MENU' ? 'menu' : 'raw',
        price: num(product.price),
        recipe: product.recipe.map((line) => ({ materialId: line.materialId, qty: num(line.qty) }))
      };
    });
    return { products, materials, domainProducts };
  }

  private async accounts(tenantId: string) {
    const rows = await this.prisma.account.findMany({ where: { tenantId } });
    return new Map(rows.map((row) => [row.code, row.id]));
  }

  private async previousHash(tenantId: string) {
    const last = await this.prisma.zatcaInvoice.findFirst({
      where: { tenantId },
      orderBy: { issuedAt: 'desc' }
    });
    return last?.invoiceHash || '0'.repeat(64);
  }

  async create(user: AuthUser, dto: CreateSaleDto) {
    const { tenant, branch, warehouse } = await this.context(user);
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const { products, materials, domainProducts } = await this.stockContext(user.tenantId, warehouse.id, productIds);
    const byId = new Map(products.map((product) => [product.id, product]));

    const items = dto.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new NotFoundException(`الصنف ${item.productId} غير موجود أو غير مفعّل.`);
      if (product.type === 'MENU' && product.recipe.length === 0) {
        throw new BadRequestException(`الصنف ${product.name} لا يملك وصفة BOM.`);
      }
      const cost = product.recipe.length
        ? recipeCost(product.recipe.map((line) => ({ materialId: line.materialId, qty: num(line.qty) })), materials)
        : num(product.cost);
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        type: product.type === 'MENU' ? ('menu' as const) : ('raw' as const),
        qty: item.qty,
        price: item.price ?? num(product.price),
        discount: item.discount || 0,
        cost,
        taxRate: num(product.taxRate)
      };
    });

    const customer = dto.customerId
      ? await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId, active: true } })
      : null;
    if (dto.customerId && !customer) throw new NotFoundException('العميل غير موجود.');

    const settings = (tenant.settings || {}) as any;
    const baseTotals = computeTotals(normalizeLines(items, num(tenant.vatRate)), {
      discount: dto.discount || 0,
      serviceCharge: dto.serviceCharge || 0,
      deliveryFee: dto.deliveryFee || 0,
      taxRate: num(tenant.vatRate)
    });

    let couponDiscount = 0;
    let coupon: any = null;
    if (dto.couponCode) {
      coupon = await this.prisma.coupon.findFirst({
        where: { tenantId: user.tenantId, code: dto.couponCode.toUpperCase().trim(), active: true }
      });
      if (!coupon) throw new BadRequestException('الكوبون غير صالح أو غير مفعّل.');
      if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) throw new BadRequestException('انتهت صلاحية الكوبون.');
      if (coupon.used >= coupon.usageLimit) throw new BadRequestException('تم استهلاك حد استخدام الكوبون.');
      if (baseTotals.subtotal < num(coupon.minSpend)) {
        throw new BadRequestException(`الحد الأدنى لاستخدام الكوبون ${num(coupon.minSpend).toFixed(2)} ر.س.`);
      }
      couponDiscount = coupon.type === 'percent'
        ? round2(baseTotals.subtotal * num(coupon.value) / 100)
        : round2(num(coupon.value));
    }

    let loyaltyDiscount = 0;
    const loyaltyPoints = Math.floor(Number(dto.loyaltyPoints) || 0);
    if (loyaltyPoints > 0) {
      if (!customer) throw new BadRequestException('استبدال نقاط الولاء يتطلب اختيار عميل.');
      if (loyaltyPoints > customer.loyaltyPoints) throw new BadRequestException('نقاط العميل غير كافية.');
      const redeemValue = Number(settings.loyalty?.redeemValue ?? 0.05);
      loyaltyDiscount = round2(loyaltyPoints * redeemValue);
    }

    const discount = round2(Math.min(baseTotals.subtotal, (dto.discount || 0) + couponDiscount + loyaltyDiscount));
    const payments: SalePaymentDto[] = dto.payments && dto.payments.length
      ? dto.payments
      : [{
          method: customer ? 'credit' : 'cash',
          amount: baseTotals.total
        }];

    const { invoice } = createSaleDraft({
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      number: await this.nextInvoiceNumber(user.tenantId),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      items,
      payments,
      customer: customer
        ? { id: customer.id, name: customer.name, phone: customer.phone || '', vatNumber: customer.vatNumber || '' }
        : null,
      customerName: customer?.name || dto.customerName || 'عميل نقدي',
      customerPhone: customer?.phone || dto.customerPhone || '',
      discount,
      serviceCharge: dto.serviceCharge || 0,
      deliveryFee: dto.deliveryFee || 0,
      taxRate: num(tenant.vatRate),
      orderType: dto.orderType || (dto.tableId ? 'dine_in' : 'takeaway'),
      tableId: dto.tableId,
      orderId: dto.orderId,
      branchId: branch.id,
      cashierId: user.sub,
      cashierName: user.name,
      shiftId: dto.shiftId,
      couponCode: coupon?.code || '',
      couponDiscount,
      loyaltyPoints,
      loyaltyDiscount,
      source: dto.source || 'pos',
      notes: dto.notes || ''
    });

    invoice.seller = {
      name: tenant.name,
      vatNumber: tenant.vatNumber || '',
      crNumber: tenant.crNumber || '',
      city: tenant.city || 'الرياض',
      address: tenant.address || ''
    };
    const previousHash = await this.previousHash(user.tenantId);
    const zatca = issueSandbox(invoice, { previousHash, timestamp: invoice.createdAt });

    const consumed = consume(
      invoice.items.map((item) => ({ productId: String(item.productId || ''), qty: item.qty })),
      domainProducts,
      materials,
      {
      referenceType: 'sale',
      referenceId: invoice.id,
      referenceNumber: invoice.number
    });
    const accountMap = await this.accounts(user.tenantId);
    const journal = buildSaleJournal(invoice);
    for (const line of journal.lines) {
      if (!accountMap.has(line.accountId)) {
        throw new BadRequestException(`الحساب المحاسبي ${line.accountId} غير مهيّأ.`);
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const invoiceRow = await tx.invoice.create({
        data: {
          tenantId: user.tenantId,
          branchId: branch.id,
          shiftId: dto.shiftId || null,
          orderId: dto.orderId || null,
          customerId: customer?.id || null,
          number: invoice.number,
          type: 'SALE',
          status: invoice.status === 'paid' ? 'PAID' : invoice.status === 'partial' ? 'PARTIAL' : 'UNPAID',
          date: dateOnly(new Date()),
          customerName: invoice.customerName,
          customerPhone: String(invoice.customerPhone || ''),
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          serviceCharge: invoice.serviceCharge,
          deliveryFee: invoice.deliveryFee,
          tax: invoice.tax,
          total: invoice.total,
          paid: invoice.paid,
          due: invoice.due,
          method: METHOD_ENUM[invoice.method] as any || 'CASH',
          notes: invoice.notes ? String(invoice.notes) : null,
          cogs: invoice.cogs,
          profit: invoice.profit,
          couponCode: invoice.couponCode ? String(invoice.couponCode) : null,
          loyaltyPoints: Number(invoice.loyaltyPoints || 0),
          loyaltyDiscount: Number(invoice.loyaltyDiscount || 0),
          cashierId: user.sub,
          syncStatus: 'SYNCED',
          snapshot: invoice as any,
          items: {
            create: invoice.items.map((item) => ({
              productId: item.productId ? String(item.productId) : null,
              name: String(item.name || ''),
              sku: item.sku ? String(item.sku) : null,
              type: item.type === 'raw' ? 'RAW' : 'MENU',
              qty: item.qty,
              price: item.price,
              discount: Number(item.discount || 0),
              net: item.net,
              taxRate: Number(item.taxRate || 0),
              taxAmount: item.taxAmount,
              total: item.total,
              cost: Number(item.cost || 0)
            }))
          },
          payments: {
            create: invoice.payments.map((payment) => ({
              method: METHOD_ENUM[payment.method] as any || 'CASH',
              amount: payment.amount,
              status: 'approved'
            }))
          },
          zatca: {
            create: {
              tenantId: user.tenantId,
              uuid: zatca.uuid,
              type: zatca.type,
              invoiceHash: zatca.invoiceHash,
              previousHash: zatca.previousHash,
              qr: zatca.qr,
              signature: zatca.signature,
              xml: String(zatca.xml || ''),
              status: zatca.status as any,
              environment: 'sandbox',
              warning: zatca.warning,
              issuedAt: new Date(zatca.issuedAt || Date.now()),
              reportedAt: new Date()
            }
          }
        },
        include: { items: true, payments: true, zatca: true }
      });

      await tx.journalEntry.create({
        data: {
          tenantId: user.tenantId,
          number: `JE-${invoice.number}`,
          date: dateOnly(new Date()),
          description: `فاتورة بيع ${invoice.number} — ${invoice.customerName}`,
          sourceType: 'sale',
          sourceId: invoiceRow.id,
          sourceNumber: invoice.number,
          totalDebit: journal.totalDebit,
          totalCredit: journal.totalCredit,
          createdById: user.sub,
          lines: {
            create: journal.lines.map((line) => ({
              accountId: accountMap.get(line.accountId)!,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo
            }))
          }
        }
      });

      for (const move of consumed.moves) {
        const material = consumed.materials[move.materialId];
        await tx.stockLevel.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: move.materialId } },
          update: { qty: material.stock },
          create: { tenantId: user.tenantId, warehouseId: warehouse.id, productId: move.materialId, qty: material.stock }
        });
        await tx.stockMove.create({
          data: {
            tenantId: user.tenantId,
            warehouseId: warehouse.id,
            productId: move.materialId,
            type: 'SALE',
            qty: move.qty,
            unitCost: move.unitCost,
            value: move.value,
            referenceType: 'sale',
            referenceId: invoiceRow.id,
            referenceNumber: invoice.number,
            note: move.note,
            createdById: user.sub
          }
        });
      }

      if (customer) {
        const earned = Math.floor(invoice.total);
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            loyaltyPoints: { increment: earned - loyaltyPoints },
            totalSpent: { increment: invoice.total },
            lastPurchaseAt: new Date()
          }
        });
        if (earned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              invoiceId: invoiceRow.id,
              points: earned,
              type: 'earn',
              note: `نقاط فاتورة ${invoice.number}`
            }
          });
        }
        if (loyaltyPoints > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              tenantId: user.tenantId,
              customerId: customer.id,
              invoiceId: invoiceRow.id,
              points: -loyaltyPoints,
              type: 'redeem',
              note: `استبدال نقاط في ${invoice.number}`
            }
          });
        }
      }

      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { used: { increment: 1 } } });
      }

      if (dto.orderId) {
        const order = await tx.order.findFirst({ where: { id: dto.orderId, tenantId: user.tenantId } });
        if (order) {
          await tx.order.update({ where: { id: order.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
          if (order.tableId) await tx.diningTable.update({ where: { id: order.tableId }, data: { status: 'free' } });
        }
      } else if (dto.tableId) {
        await tx.diningTable.update({ where: { id: dto.tableId }, data: { status: 'free' } });
      }

      for (const [index, payment] of invoice.payments.entries()) {
        if (payment.method === 'cash') continue;
        await tx.paymentTransaction.create({
          data: {
            tenantId: user.tenantId,
            invoiceId: invoiceRow.id,
            provider: dto.payments?.[index]?.provider || 'mock',
            method: METHOD_ENUM[payment.method] as any || 'CARD',
            amount: payment.amount,
            status: 'approved',
            transactionId: `TX-${Date.now()}-${index}`,
            reference: dto.payments?.[index]?.reference || 'sandbox',
            mode: 'MOCK',
            raw: { sandbox: true, note: 'محاكاة — ليست عملية دفع حقيقية' }
          }
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'فاتورة بيع جديدة',
          entity: 'invoice',
          entityId: invoiceRow.id,
          details: `${invoice.number} — ${invoice.total.toFixed(2)} SAR — ${invoice.method}`
        }
      });

      return invoiceRow;
    });

    return { data: this.mapInvoice(created) };
  }

  async createReturn(user: AuthUser, invoiceId: string, dto: CreateReturnDto) {
    const original = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: user.tenantId },
      include: { items: true, payments: true, customer: true }
    });
    if (!original) throw new NotFoundException('الفاتورة الأصلية غير موجودة.');
    if (original.type !== 'SALE') throw new BadRequestException('لا يمكن إرجاع إلا فاتورة بيع.');

    const { tenant, branch, warehouse } = await this.context(user);
    const originalDomain: any = {
      id: original.id,
      number: original.number,
      type: 'sale',
      date: original.date.toISOString().slice(0, 10),
      createdAt: original.createdAt.toISOString(),
      customerId: original.customerId,
      customerName: original.customerName,
      customerPhone: original.customerPhone,
      items: original.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        qty: num(item.qty),
        price: num(item.price),
        discount: num(item.discount),
        net: num(item.net),
        taxRate: num(item.taxRate),
        taxAmount: num(item.taxAmount),
        total: num(item.total),
        cost: num(item.cost)
      })),
      subtotal: num(original.subtotal),
      discount: num(original.discount),
      tax: num(original.tax),
      total: num(original.total),
      cogs: num(original.cogs),
      branchId: original.branchId,
      shiftId: original.shiftId,
      cashierId: original.cashierId,
      cashierName: '',
      orderType: 'takeaway'
    };

    const ret = createReturnDraft({
      original: originalDomain,
      items: dto.items,
      refundMethod: dto.refundMethod,
      notes: dto.notes,
      id: `ret_${Date.now()}`,
      number: await this.nextReturnNumber(user.tenantId),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      cashierId: user.sub,
      cashierName: user.name
    });
    ret.seller = {
      name: tenant.name,
      vatNumber: tenant.vatNumber || '',
      crNumber: tenant.crNumber || '',
      city: tenant.city || 'الرياض',
      address: tenant.address || ''
    };
    const previousHash = await this.previousHash(user.tenantId);
    const zatca = issueSandbox(ret, { previousHash, timestamp: ret.createdAt });

    const productIds = [...new Set(ret.items.map((item) => item.productId).filter((id): id is string => Boolean(id)))];
    const { materials, domainProducts } = await this.stockContext(user.tenantId, warehouse.id, productIds);
    const restored = restore(
      ret.items.map((item) => ({ productId: String(item.productId || ''), qty: item.qty })),
      domainProducts,
      materials,
      {
        referenceType: 'sale_return',
        referenceId: ret.id,
        referenceNumber: ret.number
      }
    );
    const accountMap = await this.accounts(user.tenantId);
    const journal = buildReturnJournal(ret);

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.invoice.create({
        data: {
          tenantId: user.tenantId,
          branchId: branch.id,
          shiftId: original.shiftId,
          customerId: original.customerId,
          originalInvoiceId: original.id,
          number: ret.number,
          type: 'RETURN',
          status: 'RETURNED',
          date: dateOnly(new Date()),
          customerName: ret.customerName,
          subtotal: ret.subtotal,
          tax: ret.tax,
          total: ret.total,
          paid: ret.total,
          due: 0,
          method: METHOD_ENUM[String(ret.refundMethod)] as any || 'CASH',
          cogs: ret.cogs,
          profit: ret.profit,
          notes: ret.notes ? String(ret.notes) : null,
          cashierId: user.sub,
          syncStatus: 'SYNCED',
          snapshot: ret as any,
          items: {
            create: ret.items.map((item) => ({
              productId: item.productId ? String(item.productId) : null,
              name: String(item.name || ''),
              sku: item.sku ? String(item.sku) : null,
              type: item.type === 'raw' ? 'RAW' : 'MENU',
              qty: item.qty,
              price: item.price,
              discount: Number(item.discount || 0),
              net: item.net,
              taxRate: Number(item.taxRate || 0),
              taxAmount: item.taxAmount,
              total: item.total,
              cost: Number(item.cost || 0)
            }))
          },
          payments: {
            create: ret.payments.map((payment) => ({
              method: METHOD_ENUM[payment.method] as any || 'CASH',
              amount: payment.amount,
              status: 'approved'
            }))
          },
          zatca: {
            create: {
              tenantId: user.tenantId,
              uuid: zatca.uuid,
              type: zatca.type,
              invoiceHash: zatca.invoiceHash,
              previousHash: zatca.previousHash,
              qr: zatca.qr,
              signature: zatca.signature,
              xml: String(zatca.xml || ''),
              status: zatca.status as any,
              environment: 'sandbox',
              warning: zatca.warning,
              issuedAt: new Date(zatca.issuedAt || Date.now()),
              reportedAt: new Date()
            }
          }
        },
        include: { items: true, payments: true, zatca: true }
      });

      await tx.journalEntry.create({
        data: {
          tenantId: user.tenantId,
          number: `JE-${ret.number}`,
          date: dateOnly(new Date()),
          description: `مرتجع بيع ${ret.number} — أصل ${original.number}`,
          sourceType: 'sale_return',
          sourceId: row.id,
          sourceNumber: ret.number,
          totalDebit: journal.totalDebit,
          totalCredit: journal.totalCredit,
          createdById: user.sub,
          lines: {
            create: journal.lines.map((line) => ({
              accountId: accountMap.get(line.accountId)!,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo
            }))
          }
        }
      });

      for (const move of restored.moves) {
        const material = restored.materials[move.materialId];
        await tx.stockLevel.upsert({
          where: { warehouseId_productId: { warehouseId: warehouse.id, productId: move.materialId } },
          update: { qty: material.stock },
          create: { tenantId: user.tenantId, warehouseId: warehouse.id, productId: move.materialId, qty: material.stock }
        });
        await tx.stockMove.create({
          data: {
            tenantId: user.tenantId,
            warehouseId: warehouse.id,
            productId: move.materialId,
            type: 'SALE_RETURN',
            qty: move.qty,
            unitCost: move.unitCost,
            value: move.value,
            referenceType: 'sale_return',
            referenceId: row.id,
            referenceNumber: ret.number,
            note: move.note,
            createdById: user.sub
          }
        });
      }

      if (original.customerId) {
        const currentPoints = original.customer?.loyaltyPoints || 0;
        const earnedOnOriginal = Math.floor(num(original.total));
        const reversed = Math.max(0, Math.min(currentPoints, Math.floor(ret.total), earnedOnOriginal));
        await tx.customer.update({
          where: { id: original.customerId },
          data: {
            loyaltyPoints: { decrement: reversed },
            totalSpent: { decrement: ret.total }
          }
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'مرتجع بيع',
          entity: 'invoice',
          entityId: row.id,
          details: `${ret.number} — أصل ${original.number} — ${ret.total.toFixed(2)} SAR`
        }
      });

      return row;
    });

    return { data: this.mapInvoice(created) };
  }

  private async nextInvoiceNumber(tenantId: string) {
    const rows = await this.prisma.invoice.findMany({
      where: { tenantId, type: 'SALE' },
      select: { number: true },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    const max = rows.reduce((highest, row) => {
      const match = /^TT-(\d+)$/.exec(row.number);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 1000);
    return `TT-${max + 1}`;
  }

  private async nextReturnNumber(tenantId: string) {
    const rows = await this.prisma.invoice.findMany({
      where: { tenantId, type: 'RETURN' },
      select: { number: true },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    const max = rows.reduce((highest, row) => {
      const match = /^RET-(\d+)$/.exec(row.number);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 1000);
    return `RET-${max + 1}`;
  }
}

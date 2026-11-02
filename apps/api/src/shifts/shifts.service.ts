import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { closeShift, summarizeShift } from '@talaltechno/domain';
import type { AuthUser } from '../common/types/auth-user';
import type { CloseShiftDto, OpenShiftDto } from './dto/shift.dto';

const num = (value: unknown) => Number(value || 0);
const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

const METHOD_FROM_ENUM: Record<string, string> = {
  CASH: 'cash',
  MADA: 'mada',
  APPLE_PAY: 'applepay',
  STC_PAY: 'stcpay',
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  CARD: 'card',
  BANK: 'bank',
  CREDIT: 'credit',
  WALLET: 'wallet',
  MIXED: 'mixed'
};

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapShift(row: any) {
    return {
      id: row.id,
      number: row.number,
      branchId: row.branchId,
      userId: row.userId,
      userName: row.user?.name || '',
      status: String(row.status).toLowerCase(),
      openingCash: num(row.openingCash),
      closingCash: row.closingCash === null ? null : num(row.closingCash),
      expectedCash: row.expectedCash === null ? null : num(row.expectedCash),
      variance: row.variance === null ? null : num(row.variance),
      sales: num(row.sales),
      orders: row.orders || 0,
      tax: num(row.tax),
      cogs: num(row.cogs),
      notes: row.notes || '',
      openedAt: iso(row.openedAt),
      closedAt: iso(row.closedAt)
    };
  }

  private domainShift(row: any) {
    return {
      id: row.id,
      number: row.number,
      branchId: row.branchId,
      userId: row.userId,
      userName: row.user?.name || '',
      openedAt: iso(row.openedAt) || new Date().toISOString(),
      closedAt: iso(row.closedAt),
      openingCash: num(row.openingCash),
      closingCash: row.closingCash === null ? null : num(row.closingCash),
      expectedCash: row.expectedCash === null ? null : num(row.expectedCash),
      variance: row.variance === null ? null : num(row.variance),
      status: String(row.status).toLowerCase() as 'open' | 'closed',
      notes: row.notes || ''
    };
  }

  private domainInvoice(row: any): any {
    return {
      id: row.id,
      number: row.number,
      type: String(row.type).toLowerCase() as 'sale' | 'return',
      shiftId: row.shiftId,
      total: num(row.total),
      tax: num(row.tax),
      discount: num(row.discount),
      cogs: num(row.cogs),
      items: (row.items || []).map((item: any) => ({ qty: num(item.qty), cost: num(item.cost) })),
      payments: (row.payments || []).map((payment: any) => ({
        method: METHOD_FROM_ENUM[String(payment.method)] || String(payment.method).toLowerCase(),
        amount: num(payment.amount)
      }))
    };
  }

  private domainExpense(row: any): any {
    return {
      id: row.id,
      shiftId: row.shiftId,
      amount: num(row.amount),
      method: METHOD_FROM_ENUM[String(row.method)] || String(row.method).toLowerCase()
    };
  }

  private async branchContext(user: AuthUser) {
    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });
    if (!branch) throw new BadRequestException('لا يوجد فرع مهيّأ للمنشأة.');
    return branch;
  }

  async list(tenantId: string, status?: string) {
    const rows = await this.prisma.shift.findMany({
      where: {
        tenantId,
        ...(status ? { status: status.toUpperCase() as 'OPEN' | 'CLOSED' } : {})
      },
      include: { user: true },
      orderBy: { openedAt: 'desc' },
      take: 100
    });
    return { data: rows.map((row) => this.mapShift(row)) };
  }

  async current(user: AuthUser) {
    const row = await this.prisma.shift.findFirst({
      where: { tenantId: user.tenantId, userId: user.sub, status: 'OPEN' },
      include: { user: true },
      orderBy: { openedAt: 'desc' }
    });
    return { data: row ? this.mapShift(row) : null };
  }

  async open(user: AuthUser, dto: OpenShiftDto) {
    const branch = await this.branchContext(user);
    const existing = await this.prisma.shift.findFirst({
      where: { tenantId: user.tenantId, userId: user.sub, status: 'OPEN' }
    });
    if (existing) throw new BadRequestException('لديك وردية مفتوحة بالفعل. أغلقها قبل فتح وردية جديدة.');

    const count = await this.prisma.shift.count({ where: { tenantId: user.tenantId } });
    const number = `SH-${1001 + count}`;

    const row = await this.prisma.shift.create({
      data: {
        tenantId: user.tenantId,
        branchId: branch.id,
        userId: user.sub,
        number,
        status: 'OPEN',
        openingCash: dto.openingCash,
        notes: dto.notes || null
      },
      include: { user: true }
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'فتح وردية',
        entity: 'shift',
        entityId: row.id,
        details: `${number} — نقدية افتتاحية ${dto.openingCash.toFixed(2)} SAR`
      }
    });

    return { data: this.mapShift(row) };
  }

  async summary(tenantId: string, id: string) {
    const row = await this.prisma.shift.findFirst({
      where: { id, tenantId },
      include: { user: true }
    });
    if (!row) throw new NotFoundException('الوردية غير موجودة.');

    const [invoices, expenses] = await Promise.all([
      this.prisma.invoice.findMany({ where: { tenantId, shiftId: id }, include: { items: true, payments: true } }),
      this.prisma.expense.findMany({ where: { tenantId, shiftId: id } })
    ]);

    const summary = summarizeShift(
      this.domainShift(row),
      invoices.map((invoice) => this.domainInvoice(invoice)),
      expenses.map((expense) => this.domainExpense(expense))
    );

    return {
      data: {
        shift: this.mapShift(row),
        sales: summary.sales,
        refunds: summary.refunds,
        tax: summary.tax,
        discounts: summary.discounts,
        cogs: summary.cogs,
        count: summary.count,
        avgTicket: summary.avgTicket,
        cashSales: summary.cashSales,
        cashExpenses: summary.cashExpenses,
        expectedCash: summary.expectedCash,
        byMethod: summary.byMethod
      }
    };
  }

  async close(user: AuthUser, id: string, dto: CloseShiftDto) {
    const row = await this.prisma.shift.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { user: true }
    });
    if (!row) throw new NotFoundException('الوردية غير موجودة.');
    if (row.status !== 'OPEN') throw new BadRequestException('الوردية مغلقة بالفعل.');

    const [invoices, expenses] = await Promise.all([
      this.prisma.invoice.findMany({ where: { tenantId: user.tenantId, shiftId: id }, include: { items: true, payments: true } }),
      this.prisma.expense.findMany({ where: { tenantId: user.tenantId, shiftId: id } })
    ]);

    let closed: any;
    try {
      closed = closeShift(
        this.domainShift(row),
        dto.countedCash,
        invoices.map((invoice) => this.domainInvoice(invoice)),
        expenses.map((expense) => this.domainExpense(expense))
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'تعذر إغلاق الوردية.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.shift.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closingCash: closed.closingCash,
          expectedCash: closed.expectedCash,
          variance: closed.variance,
          sales: closed.sales,
          orders: closed.orders,
          tax: closed.tax,
          cogs: closed.cogs,
          notes: dto.notes || row.notes || null,
          closedAt: new Date(closed.closedAt)
        },
        include: { user: true }
      });
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'إغلاق وردية',
          entity: 'shift',
          entityId: id,
          details: `${row.number} — فرق ${closed.variance.toFixed(2)} SAR`
        }
      });
      return result;
    });

    return { data: { ...this.mapShift(updated), byMethod: closed.byMethod } };
  }
}

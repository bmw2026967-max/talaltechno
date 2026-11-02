import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { round2 } from '@talaltechno/domain';
import type { AuthUser } from '../common/types/auth-user';
import type { AdjustLoyaltyDto, CreateCouponDto, CreateCustomerDto } from './dto/crm.dto';

const num = (value: unknown) => Number(value || 0);

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  async customers(tenantId: string, search?: string) {
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId,
        active: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { code: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: { _count: { select: { invoices: true } } },
      orderBy: [{ totalSpent: 'desc' }, { name: 'asc' }],
      take: 200
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        phone: row.phone,
        email: row.email,
        vatNumber: row.vatNumber,
        loyaltyPoints: row.loyaltyPoints,
        tier: row.tier,
        totalSpent: num(row.totalSpent),
        invoices: row._count.invoices,
        lastPurchaseAt: row.lastPurchaseAt ? row.lastPurchaseAt.toISOString() : null
      })),
      meta: {
        total: rows.length,
        points: rows.reduce((total, row) => total + row.loyaltyPoints, 0)
      }
    };
  }

  async createCustomer(user: AuthUser, dto: CreateCustomerDto) {
    const count = await this.prisma.customer.count({ where: { tenantId: user.tenantId } });
    const row = await this.prisma.customer.create({
      data: {
        tenantId: user.tenantId,
        code: `C${String(count + 1).padStart(3, '0')}`,
        name: dto.name,
        phone: dto.phone || null,
        email: dto.email || null,
        vatNumber: dto.vatNumber || null,
        address: dto.address || null
      }
    });
    return { data: { id: row.id, code: row.code, name: row.name, loyaltyPoints: 0 } };
  }

  async loyalty(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundException('العميل غير موجود.');
    const rows = await this.prisma.loyaltyTransaction.findMany({
      where: { tenantId, customerId },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return {
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          loyaltyPoints: customer.loyaltyPoints,
          tier: customer.tier,
          totalSpent: num(customer.totalSpent)
        },
        transactions: rows.map((row) => ({
          id: row.id,
          points: row.points,
          type: row.type,
          note: row.note,
          invoiceNumber: row.invoice?.number || null,
          createdAt: row.createdAt.toISOString()
        }))
      }
    };
  }

  async adjustLoyalty(user: AuthUser, customerId: string, dto: AdjustLoyaltyDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('العميل غير موجود.');
    const next = customer.loyaltyPoints + dto.points;
    if (next < 0) throw new BadRequestException('لا يمكن أن يصبح رصيد النقاط سالباً.');

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({ where: { id: customerId }, data: { loyaltyPoints: next } });
      return tx.loyaltyTransaction.create({
        data: {
          tenantId: user.tenantId,
          customerId,
          points: dto.points,
          type: dto.points >= 0 ? 'adjust_add' : 'adjust_remove',
          note: dto.note
        }
      });
    });

    return { data: { id: row.id, points: row.points, balance: next } };
  }

  async coupons(tenantId: string) {
    const rows = await this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        type: row.type,
        value: num(row.value),
        minSpend: num(row.minSpend),
        usageLimit: row.usageLimit,
        used: row.used,
        active: row.active,
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
        remaining: Math.max(0, row.usageLimit - row.used)
      }))
    };
  }

  async createCoupon(user: AuthUser, dto: CreateCouponDto) {
    if (dto.type === 'percent' && dto.value > 100) {
      throw new BadRequestException('نسبة الخصم لا يمكن أن تتجاوز 100%.');
    }
    const code = dto.code.toUpperCase().trim();
    const existing = await this.prisma.coupon.findFirst({ where: { tenantId: user.tenantId, code } });
    if (existing) throw new BadRequestException('رمز الكوبون مستخدم بالفعل.');

    const row = await this.prisma.coupon.create({
      data: {
        tenantId: user.tenantId,
        code,
        type: dto.type,
        value: dto.value,
        minSpend: dto.minSpend || 0,
        usageLimit: dto.usageLimit || 100,
        active: dto.active !== false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null
      }
    });
    return { data: { id: row.id, code: row.code, type: row.type, value: num(row.value) } };
  }
}

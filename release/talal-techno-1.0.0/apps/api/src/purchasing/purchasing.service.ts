import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ACCOUNTS, round2 } from '@talaltechno/domain';
import type { AuthUser } from '../common/types/auth-user';
import type { CreatePurchaseOrderDto, CreateSupplierDto } from './dto/purchasing.dto';

const num = (value: unknown) => Number(value || 0);
const dateOnly = (value: string | Date) => new Date(new Date(value).toISOString().slice(0, 10));

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  async suppliers(tenantId: string) {
    const rows = await this.prisma.supplier.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' }
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        vatNumber: row.vatNumber,
        address: row.address,
        balance: num(row.balance)
      }))
    };
  }

  async createSupplier(user: AuthUser, dto: CreateSupplierDto) {
    const row = await this.prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        phone: dto.phone || null,
        email: dto.email || null,
        vatNumber: dto.vatNumber || null,
        address: dto.address || null
      }
    });
    return { data: { id: row.id, name: row.name, balance: 0 } };
  }

  private mapOrder(row: any) {
    return {
      id: row.id,
      number: row.number,
      status: String(row.status).toLowerCase(),
      date: row.date.toISOString().slice(0, 10),
      supplierId: row.supplierId,
      supplierName: row.supplier?.name || '',
      subtotal: num(row.subtotal),
      tax: num(row.tax),
      total: num(row.total),
      notes: row.notes,
      items: (row.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        name: item.product?.name || '',
        qty: num(item.qty),
        unitCost: num(item.unitCost),
        taxRate: num(item.taxRate),
        total: num(item.total)
      }))
    };
  }

  async orders(tenantId: string) {
    const rows = await this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      include: { supplier: true, items: { include: { product: true } }, warehouse: true },
      orderBy: { date: 'desc' },
      take: 100
    });
    return { data: rows.map((row) => this.mapOrder(row)) };
  }

  async createOrder(user: AuthUser, dto: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId: user.tenantId } });
    if (!supplier) throw new NotFoundException('المورد غير موجود.');

    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });
    if (!branch) throw new BadRequestException('لا يوجد فرع مهيّأ.');

    const warehouse = dto.warehouseId
      ? await this.prisma.warehouse.findFirst({ where: { id: dto.warehouseId, tenantId: user.tenantId } })
      : await this.prisma.warehouse.findFirst({ where: { tenantId: user.tenantId, branchId: branch.id } });
    if (!warehouse) throw new NotFoundException('المخزن غير موجود.');

    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, id: { in: dto.items.map((item) => item.productId) } }
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    for (const item of dto.items) {
      if (!byId.has(item.productId)) throw new NotFoundException(`الصنف ${item.productId} غير موجود.`);
    }

    const subtotal = round2(dto.items.reduce((total, item) => total + item.qty * item.unitCost, 0));
    const tax = round2(dto.items.reduce((total, item) => {
      const rate = item.taxRate === undefined ? 15 : item.taxRate;
      return total + item.qty * item.unitCost * rate / 100;
    }, 0));
    const count = await this.prisma.purchaseOrder.count({ where: { tenantId: user.tenantId } });
    const number = `PO-${1001 + count}`;

    const row = await this.prisma.purchaseOrder.create({
      data: {
        tenantId: user.tenantId,
        branchId: branch.id,
        warehouseId: warehouse.id,
        supplierId: supplier.id,
        number,
        status: 'ORDERED',
        date: dateOnly(dto.date || new Date()),
        subtotal,
        tax,
        total: round2(subtotal + tax),
        notes: dto.notes || null,
        items: {
          create: dto.items.map((item) => {
            const rate = item.taxRate === undefined ? 15 : item.taxRate;
            return {
              productId: item.productId,
              qty: item.qty,
              unitCost: item.unitCost,
              taxRate: rate,
              total: round2(item.qty * item.unitCost * (1 + rate / 100))
            };
          })
        }
      },
      include: { supplier: true, items: { include: { product: true } }, warehouse: true }
    });

    return { data: this.mapOrder(row) };
  }

  async receive(user: AuthUser, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: { include: { product: true } }, supplier: true, warehouse: true }
    });
    if (!order) throw new NotFoundException('أمر الشراء غير موجود.');
    if (order.status === 'RECEIVED') throw new BadRequestException('تم استلام أمر الشراء مسبقاً.');
    if (order.status === 'CANCELLED') throw new BadRequestException('أمر الشراء ملغي.');

    const accounts = await this.prisma.account.findMany({ where: { tenantId: user.tenantId } });
    const byCode = new Map(accounts.map((account) => [account.code, account.id]));
    if (!byCode.has(ACCOUNTS.inventory) || !byCode.has(ACCOUNTS.vatInput) || !byCode.has(ACCOUNTS.ap)) {
      throw new BadRequestException('شجرة الحسابات غير مكتملة.');
    }

    const subtotal = num(order.subtotal);
    const tax = num(order.tax);
    const total = num(order.total);

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const level = await tx.stockLevel.findUnique({
          where: { warehouseId_productId: { warehouseId: order.warehouseId, productId: item.productId } }
        });
        const nextQty = round2(num(level?.qty) + num(item.qty));
        await tx.stockLevel.upsert({
          where: { warehouseId_productId: { warehouseId: order.warehouseId, productId: item.productId } },
          update: { qty: nextQty },
          create: {
            tenantId: user.tenantId,
            warehouseId: order.warehouseId,
            productId: item.productId,
            qty: num(item.qty)
          }
        });
        await tx.stockMove.create({
          data: {
            tenantId: user.tenantId,
            warehouseId: order.warehouseId,
            productId: item.productId,
            type: 'PURCHASE',
            qty: item.qty,
            unitCost: item.unitCost,
            value: round2(num(item.qty) * num(item.unitCost)),
            referenceType: 'purchase',
            referenceId: order.id,
            referenceNumber: order.number,
            note: `استلام من ${order.supplier.name}`,
            createdById: user.sub
          }
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { cost: item.unitCost }
        });
      }

      await tx.journalEntry.create({
        data: {
          tenantId: user.tenantId,
          number: `JE-${order.number}`,
          date: dateOnly(new Date()),
          description: `شراء مخزون ${order.number} — ${order.supplier.name}`,
          sourceType: 'purchase',
          sourceId: order.id,
          sourceNumber: order.number,
          totalDebit: round2(subtotal + tax),
          totalCredit: total,
          createdById: user.sub,
          lines: {
            create: [
              { accountId: byCode.get(ACCOUNTS.inventory)!, debit: subtotal, credit: 0, memo: 'مخزون مشتريات' },
              { accountId: byCode.get(ACCOUNTS.vatInput)!, debit: tax, credit: 0, memo: 'ضريبة مدخلات' },
              { accountId: byCode.get(ACCOUNTS.ap)!, debit: 0, credit: total, memo: `مستحق ${order.supplier.name}` }
            ]
          }
        }
      });

      await tx.supplier.update({
        where: { id: order.supplierId },
        data: { balance: { increment: total } }
      });

      return tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: 'RECEIVED' },
        include: { supplier: true, items: { include: { product: true } }, warehouse: true }
      });
    });

    return { data: this.mapOrder(result) };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import type { AddOrderItemsDto, CreateOrderDto, OrderItemInput } from './dto/order.dto';

const money = (value: unknown) => Number(value || 0);
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const STATUS_MAP: Record<string, string> = {
  new: 'NEW',
  preparing: 'PREPARING',
  ready: 'READY',
  served: 'SERVED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED'
};

const TYPE_MAP: Record<string, string> = {
  dine_in: 'DINE_IN',
  takeaway: 'TAKEAWAY',
  delivery: 'DELIVERY',
  curbside: 'CURBSIDE'
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(tenantId: string) {
    const count = await this.prisma.order.count({ where: { tenantId } });
    return `ORD-${String(count + 1).padStart(4, '0')}`;
  }

  private async buildLines(tenantId: string, items: OrderItemInput[]) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: items.map((item) => item.productId) }, active: true }
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    return items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new NotFoundException(`الصنف ${item.productId} غير موجود.`);
      return {
        productId: product.id,
        name: product.name,
        qty: item.qty,
        price: item.price ?? money(product.price),
        cost: money(product.cost),
        notes: item.notes || null,
        station: item.station || (product.type === 'MENU' ? 'hot' : 'store')
      };
    });
  }

  private totals(lines: Array<{ qty: number; price: number }>, taxRate = 15) {
    const subtotal = round2(lines.reduce((total, line) => total + line.qty * line.price, 0));
    const tax = round2(subtotal * taxRate / 100);
    return { subtotal, tax, total: round2(subtotal + tax) };
  }

  async list(tenantId: string, query: { status?: string; platform?: string }) {
    const rows = await this.prisma.order.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: (STATUS_MAP[query.status] || query.status.toUpperCase()) as any } : {}),
        ...(query.platform ? { platform: query.platform.toUpperCase() as any } : {})
      },
      include: { items: true, table: true, deliveryOrder: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return { data: rows };
  }

  async get(tenantId: string, id: string) {
    const row = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: { items: true, table: true, invoices: true, deliveryOrder: true }
    });
    if (!row) throw new NotFoundException('الطلب غير موجود.');
    return { data: row };
  }

  async create(user: AuthUser, dto: CreateOrderDto) {
    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });
    if (!branch) throw new BadRequestException('لا يوجد فرع مهيّأ للمنشأة.');

    if (dto.type === 'dine_in' && !dto.tableId) {
      throw new BadRequestException('الطلب المحلي يتطلب اختيار طاولة.');
    }
    if (dto.tableId) {
      const table = await this.prisma.diningTable.findFirst({ where: { id: dto.tableId, tenantId: user.tenantId } });
      if (!table) throw new NotFoundException('الطاولة غير موجودة.');
    }

    const lines = await this.buildLines(user.tenantId, dto.items);
    const totals = this.totals(lines);
    const number = await this.nextNumber(user.tenantId);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId: user.tenantId,
          branchId: branch.id,
          number,
          type: TYPE_MAP[dto.type] as any,
          status: 'NEW',
          tableId: dto.tableId || null,
          customerId: dto.customerId || null,
          platform: (dto.platform ? dto.platform.toUpperCase() : 'DIRECT') as any,
          platformName: dto.platformName || null,
          externalOrderId: dto.externalOrderId || null,
          notes: dto.notes || null,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              name: line.name,
              qty: line.qty,
              price: line.price,
              cost: line.cost,
              notes: line.notes,
              station: line.station,
              status: 'NEW'
            }))
          }
        },
        include: { items: true, table: true }
      });
      if (dto.tableId) {
        await tx.diningTable.update({ where: { id: dto.tableId }, data: { status: 'occupied' } });
      }
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'إنشاء طلب',
          entity: 'order',
          entityId: created.id,
          details: `${number} — ${totals.total.toFixed(2)} SAR`
        }
      });
      return created;
    });

    return { data: order };
  }

  async setStatus(user: AuthUser, id: string, status: string) {
    const order = await this.prisma.order.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('الطلب غير موجود.');
    const next = STATUS_MAP[status] as any;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id },
        data: {
          status: next,
          ...(status === 'ready' ? { readyAt: new Date() } : {}),
          ...(status === 'served' ? { servedAt: new Date() } : {}),
          ...(status === 'completed' ? { completedAt: new Date() } : {})
        },
        include: { items: true, table: true }
      });
      if (status === 'completed' || status === 'cancelled') {
        if (row.tableId) await tx.diningTable.update({ where: { id: row.tableId }, data: { status: 'free' } });
      }
      await tx.orderItem.updateMany({
        where: { orderId: id },
        data: { status: status === 'completed' ? 'SERVED' : status === 'cancelled' ? 'CANCELLED' : status === 'ready' ? 'READY' : status === 'preparing' ? 'PREPARING' : 'NEW' }
      });
      // Re-read after the item update so the response reflects item statuses.
      return tx.order.findUniqueOrThrow({ where: { id }, include: { items: true, table: true } });
    });

    return { data: updated };
  }

  async addItems(user: AuthUser, id: string, dto: AddOrderItemsDto) {
    const order = await this.prisma.order.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!order) throw new NotFoundException('الطلب غير موجود.');
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('لا يمكن تعديل طلب مكتمل أو ملغي.');
    }

    const lines = await this.buildLines(user.tenantId, dto.items);
    const allLines = [...order.items.map((item) => ({ qty: money(item.qty), price: money(item.price) })), ...lines];
    const totals = this.totals(allLines);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.createMany({
        data: lines.map((line) => ({
          orderId: id,
          productId: line.productId,
          name: line.name,
          qty: line.qty,
          price: line.price,
          cost: line.cost,
          notes: line.notes,
          station: line.station,
          status: 'NEW'
        }))
      });
      return tx.order.update({
        where: { id },
        data: { subtotal: totals.subtotal, tax: totals.tax, total: totals.total },
        include: { items: true, table: true }
      });
    });

    return { data: updated };
  }

  async transfer(user: AuthUser, id: string, tableId: string) {
    const order = await this.prisma.order.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!order) throw new NotFoundException('الطلب غير موجود.');
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, tenantId: user.tenantId } });
    if (!table) throw new NotFoundException('الطاولة غير موجودة.');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (order.tableId && order.tableId !== tableId) {
        await tx.diningTable.update({ where: { id: order.tableId }, data: { status: 'free' } });
      }
      await tx.diningTable.update({ where: { id: tableId }, data: { status: 'occupied' } });
      return tx.order.update({
        where: { id },
        data: { tableId, type: 'DINE_IN' },
        include: { items: true, table: true }
      });
    });

    return { data: updated };
  }

  async split(user: AuthUser, id: string, itemIds: string[]) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true }
    });
    if (!order) throw new NotFoundException('الطلب غير موجود.');
    const selected = order.items.filter((item) => itemIds.includes(item.id));
    if (selected.length === 0) throw new BadRequestException('لم يتم اختيار أي بند للتقسيم.');
    if (selected.length === order.items.length) throw new BadRequestException('لا يمكن تقسيم كل البنود إلى طلب جديد.');

    const branch = await this.prisma.branch.findFirst({ where: { id: order.branchId } });
    if (!branch) throw new BadRequestException('الفرع غير موجود.');
    const number = await this.nextNumber(user.tenantId);
    const remaining = order.items.filter((item) => !itemIds.includes(item.id));
    const selectedTotals = this.totals(selected.map((item) => ({ qty: money(item.qty), price: money(item.price) })));
    const remainingTotals = this.totals(remaining.map((item) => ({ qty: money(item.qty), price: money(item.price) })));

    const created = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          tenantId: user.tenantId,
          branchId: order.branchId,
          number,
          type: order.type,
          status: order.status,
          tableId: order.tableId,
          customerId: order.customerId,
          platform: order.platform,
          platformName: order.platformName,
          subtotal: selectedTotals.subtotal,
          tax: selectedTotals.tax,
          total: selectedTotals.total,
          notes: `تقسيم من ${order.number}`,
          items: {
            create: selected.map((item) => ({
              productId: item.productId,
              name: item.name,
              qty: item.qty,
              price: item.price,
              cost: item.cost,
              notes: item.notes,
              station: item.station,
              status: item.status
            }))
          }
        },
        include: { items: true }
      });
      await tx.orderItem.deleteMany({ where: { id: { in: selected.map((item) => item.id) } } });
      await tx.order.update({
        where: { id },
        data: { subtotal: remainingTotals.subtotal, tax: remainingTotals.tax, total: remainingTotals.total }
      });
      return newOrder;
    });

    return { data: created, meta: { sourceOrderId: id, sourceNumber: order.number } };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { verifyChain } from '@talaltechno/domain';

const num = (value: unknown) => Number(value || 0);
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const dayKey = (value: Date | string) => new Date(value).toISOString().slice(0, 10);

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private startOfMonth(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  async stats(tenantId: string) {
    const now = new Date();
    const today = this.startOfDay(now);
    const month = this.startOfMonth(now);

    const [monthInvoices, openChecks, kitchenQueue, deliveryOrders, branch, zatcaRows] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, date: { gte: month } },
        include: { items: true },
        orderBy: { date: 'asc' }
      }),
      this.prisma.order.count({
        where: { tenantId, status: { in: ['NEW', 'PREPARING', 'READY', 'SERVED'] } }
      }),
      this.prisma.order.count({ where: { tenantId, status: { in: ['NEW', 'PREPARING'] } } }),
      this.prisma.deliveryOrder.count({ where: { tenantId, status: { notIn: ['delivered', 'cancelled'] } } }),
      this.prisma.branch.findFirst({ where: { tenantId } }),
      this.prisma.zatcaInvoice.findMany({ where: { tenantId }, orderBy: { issuedAt: 'asc' } })
    ]);

    const sales = monthInvoices.filter((invoice) => invoice.type === 'SALE');
    const returns = monthInvoices.filter((invoice) => invoice.type === 'RETURN');
    const todaySales = sales.filter((invoice) => invoice.date >= today);
    const todayReturns = returns.filter((invoice) => invoice.date >= today);

    const sum = (rows: any[], selector: (row: any) => number) => round2(rows.reduce((total, row) => total + selector(row), 0));
    const todayGross = sum(todaySales, (row) => num(row.total));
    const todayRefunds = sum(todayReturns, (row) => num(row.total));
    const monthGross = sum(sales, (row) => num(row.total));
    const monthRefunds = sum(returns, (row) => num(row.total));

    const warehouse = branch
      ? await this.prisma.warehouse.findFirst({ where: { tenantId, branchId: branch.id } })
      : null;
    const rawProducts = warehouse
      ? await this.prisma.product.findMany({
          where: { tenantId, type: 'RAW', active: true },
          include: { stockLevels: { where: { warehouseId: warehouse.id } } }
        })
      : [];

    const lowStock = rawProducts
      .map((product) => ({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        stock: num(product.stockLevels[0]?.qty),
        minStock: num(product.minStock)
      }))
      .filter((row) => row.minStock > 0 && row.stock <= row.minStock)
      .sort((a, b) => (a.stock / (a.minStock || 1)) - (b.stock / (b.minStock || 1)))
      .slice(0, 10);

    const chain = verifyChain(
      zatcaRows.map((row) => ({
        id: row.invoiceId,
        number: row.uuid,
        createdAt: row.issuedAt.toISOString(),
        zatca: {
          invoiceHash: row.invoiceHash,
          previousHash: row.previousHash,
          qr: row.qr,
          signature: row.signature,
          issuedAt: row.issuedAt.toISOString()
        }
      })) as any
    );

    return {
      data: {
        today: {
          sales: round2(todayGross - todayRefunds),
          gross: todayGross,
          refunds: todayRefunds,
          orders: todaySales.length,
          avgTicket: todaySales.length ? round2(todayGross / todaySales.length) : 0,
          tax: sum(todaySales, (row) => num(row.tax))
        },
        month: {
          sales: round2(monthGross - monthRefunds),
          gross: monthGross,
          refunds: monthRefunds,
          cogs: sum(sales, (row) => num(row.cogs)),
          profit: round2(sum(sales, (row) => num(row.profit)) - sum(returns, (row) => num(row.profit)))
        },
        openChecks,
        kitchenQueue,
        deliveryOrders,
        lowStock,
        zatca: {
          status: 'sandbox',
          reported: zatcaRows.filter((row) => row.status === 'REPORTED').length,
          cleared: zatcaRows.filter((row) => row.status === 'CLEARED').length,
          pending: zatcaRows.filter((row) => row.status === 'PENDING').length,
          rejected: zatcaRows.filter((row) => row.status === 'REJECTED').length,
          chainValid: chain.valid,
          chainChecked: chain.checked
        },
        warning: 'لوحة تجريبية — بيانات Sandbox وليست اعتماداً رسمياً.'
      }
    };
  }

  async salesTrend(tenantId: string, days = 7) {
    const safeDays = Math.min(90, Math.max(1, days));
    const from = this.startOfDay(new Date());
    from.setUTCDate(from.getUTCDate() - (safeDays - 1));

    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, date: { gte: from } },
      orderBy: { date: 'asc' }
    });

    const buckets = new Map<string, { date: string; sales: number; returns: number; orders: number; tax: number }>();
    for (let index = 0; index < safeDays; index += 1) {
      const date = new Date(from);
      date.setUTCDate(from.getUTCDate() + index);
      buckets.set(dayKey(date), { date: dayKey(date), sales: 0, returns: 0, orders: 0, tax: 0 });
    }

    invoices.forEach((invoice) => {
      const key = dayKey(invoice.date);
      const bucket = buckets.get(key);
      if (!bucket) return;
      if (invoice.type === 'SALE') {
        bucket.sales = round2(bucket.sales + num(invoice.total));
        bucket.tax = round2(bucket.tax + num(invoice.tax));
        bucket.orders += 1;
      } else {
        bucket.returns = round2(bucket.returns + num(invoice.total));
      }
    });

    return { data: [...buckets.values()] };
  }

  async topProducts(tenantId: string, days = 30, limit = 8) {
    const from = this.startOfDay(new Date());
    from.setUTCDate(from.getUTCDate() - Math.max(1, days) + 1);
    const items = await this.prisma.invoiceItem.findMany({
      where: { invoice: { tenantId, type: 'SALE', date: { gte: from } } },
      include: { invoice: true }
    });

    const map = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    items.forEach((item) => {
      const key = item.productId || item.name;
      const current = map.get(key) || { name: item.name, qty: 0, revenue: 0, cost: 0 };
      current.qty = round2(current.qty + num(item.qty));
      current.revenue = round2(current.revenue + num(item.total));
      current.cost = round2(current.cost + num(item.cost) * num(item.qty));
      map.set(key, current);
    });

    return {
      data: [...map.entries()]
        .map(([productId, row]) => ({
          productId,
          ...row,
          profit: round2(row.revenue - row.cost)
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, Math.min(50, Math.max(1, limit)))
    };
  }

  async recent(tenantId: string) {
    const [invoices, orders] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 8
      }),
      this.prisma.order.findMany({
        where: { tenantId },
        include: { items: true, table: true },
        orderBy: { createdAt: 'desc' },
        take: 8
      })
    ]);

    return {
      data: {
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          number: invoice.number,
          type: String(invoice.type).toLowerCase(),
          customerName: invoice.customerName,
          total: num(invoice.total),
          status: String(invoice.status).toLowerCase(),
          createdAt: invoice.createdAt.toISOString()
        })),
        orders: orders.map((order) => ({
          id: order.id,
          number: order.number,
          type: String(order.type).toLowerCase(),
          status: String(order.status).toLowerCase(),
          tableName: order.table?.name || null,
          total: num(order.total),
          items: order.items.length,
          createdAt: order.createdAt.toISOString()
        }))
      }
    };
  }
}

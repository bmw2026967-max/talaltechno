import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePublicOrderDto } from './dto/public-order.dto';

const money = (value: unknown) => Number(value || 0);
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

type MenuContext = {
  tenant: any;
  branch: any;
  table: any | null;
  settings: any;
  emenu: any;
};

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveContext(tableToken?: string, branchCode?: string): Promise<MenuContext> {
    let table = null;
    let branch = null;

    if (tableToken) {
      table = await this.prisma.diningTable.findFirst({
        where: { qrToken: tableToken, active: true },
        include: { branch: { include: { tenant: true } }, tenant: true }
      });
      if (table) branch = table.branch;
    }

    if (!branch && branchCode) {
      branch = await this.prisma.branch.findFirst({
        where: { code: branchCode, active: true },
        include: { tenant: true }
      });
    }

    if (!branch) {
      branch = await this.prisma.branch.findFirst({
        where: { active: true },
        include: { tenant: true },
        orderBy: { createdAt: 'asc' }
      });
    }

    if (!branch) throw new NotFoundException('لا توجد قائمة متاحة حالياً.');

    const tenant = branch.tenant ?? (await this.prisma.tenant.findUnique({ where: { id: branch.tenantId } }));
    if (!tenant || !tenant.active) throw new NotFoundException('المنشأة غير متاحة.');

    const settings = (tenant.settings || {}) as Record<string, any>;
    const emenu = {
      enabled: settings?.emenu?.enabled !== false,
      allowSelfOrder: settings?.emenu?.allowSelfOrder === true,
      requireTable: settings?.emenu?.requireTable !== false,
      welcomeText: settings?.emenu?.welcomeText || 'أهلاً بكم — اختر أصنافك المفضلة.'
    };
    if (!emenu.enabled) throw new NotFoundException('القائمة الإلكترونية غير مفعّلة.');

    return { tenant, branch, table, settings, emenu };
  }

  async menu(tableToken?: string, branchCode?: string) {
    const context = await this.resolveContext(tableToken, branchCode);
    const [categories, products, warehouse] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId: context.tenant.id, active: true },
        orderBy: { sort: 'asc' }
      }),
      this.prisma.product.findMany({
        where: { tenantId: context.tenant.id, type: 'MENU', active: true },
        include: { category: true, recipe: true },
        orderBy: { name: 'asc' }
      }),
      this.prisma.warehouse.findFirst({
        where: { tenantId: context.tenant.id, branchId: context.branch.id, active: true }
      })
    ]);

    const levels = warehouse
      ? await this.prisma.stockLevel.findMany({ where: { tenantId: context.tenant.id, warehouseId: warehouse.id } })
      : [];
    const stockByMaterial = new Map(levels.map((level) => [level.productId, money(level.qty)]));

    const menuProducts = products.map((product) => {
      let availableServings: number | null = null;
      if (product.recipe.length > 0) {
        availableServings = Math.min(
          ...product.recipe.map((line) => {
            const stock = stockByMaterial.get(line.materialId) || 0;
            const qty = money(line.qty);
            return qty > 0 ? Math.floor(stock / qty) : 0;
          })
        );
      }
      const available = product.available && (availableServings === null || availableServings > 0);
      return {
        id: product.id,
        name: product.name,
        nameEn: product.nameEn,
        price: money(product.price),
        taxRate: money(product.taxRate),
        categoryId: product.categoryId,
        categoryName: product.category?.name || null,
        emoji: product.emoji,
        unit: product.unit,
        available,
        availableServings
      };
    });

    return {
      data: {
        tenant: {
          name: context.tenant.name,
          vatNumber: context.tenant.vatNumber,
          currency: context.tenant.currency,
          city: context.tenant.city
        },
        branch: { id: context.branch.id, name: context.branch.name, code: context.branch.code },
        table: context.table ? { id: context.table.id, name: context.table.name, token: context.table.qrToken } : null,
        settings: {
          allowSelfOrder: context.emenu.allowSelfOrder,
          requireTable: context.emenu.requireTable,
          welcomeText: context.emenu.welcomeText
        },
        categories: categories.map((category) => ({ id: category.id, name: category.name, nameEn: category.nameEn })),
        products: menuProducts,
        disclaimer: 'طلب تجريبي عبر القائمة الإلكترونية — الدفع عند الكاشير. لا تُجرى مدفوعات إلكترونية من هذه الصفحة.'
      }
    };
  }

  async createOrder(dto: CreatePublicOrderDto) {
    const context = await this.resolveContext(dto.table, dto.branch);
    if (!context.emenu.allowSelfOrder) {
      throw new BadRequestException('الطلب الذاتي من القائمة الإلكترونية غير مفعّل. يرجى الطلب من الكاشير.');
    }
    if (context.emenu.requireTable && !context.table) {
      throw new BadRequestException('يرجى مسح رمز QR الخاص بالطاولة لإرسال الطلب.');
    }
    if (dto.type === 'dine_in' && !context.table) {
      throw new BadRequestException('الطلب المحلي يتطلب طاولة مرتبطة برمز QR.');
    }

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: context.tenant.id,
        id: { in: dto.items.map((item) => item.productId) },
        type: 'MENU',
        active: true,
        available: true
      }
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    const lines = dto.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) throw new NotFoundException('أحد الأصناف غير متاح. حدّث القائمة وحاول مجدداً.');
      return {
        productId: product.id,
        name: product.name,
        qty: item.qty,
        price: money(product.price),
        cost: money(product.cost),
        notes: item.notes || null,
        station: 'hot'
      };
    });

    const subtotal = round2(lines.reduce((total, line) => total + line.qty * line.price, 0));
    const tax = round2((subtotal * money(context.tenant.vatRate || 15)) / 100);
    const total = round2(subtotal + tax);
    const count = await this.prisma.order.count({ where: { tenantId: context.tenant.id } });
    const number = `ORD-${String(count + 1).padStart(4, '0')}`;
    const guest = [dto.customerName, dto.customerPhone].filter(Boolean).join(' · ');

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tenantId: context.tenant.id,
          branchId: context.branch.id,
          number,
          type: context.table ? 'DINE_IN' : 'TAKEAWAY',
          status: 'NEW',
          tableId: context.table?.id || null,
          platform: 'DIRECT',
          platformName: 'QR E-Menu',
          externalOrderId: `EMENU-${Date.now()}`,
          notes: [guest, dto.notes].filter(Boolean).join(' — ') || null,
          subtotal,
          tax,
          total,
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
      if (context.table) {
        await tx.diningTable.update({ where: { id: context.table.id }, data: { status: 'occupied' } });
      }
      await tx.auditLog.create({
        data: {
          tenantId: context.tenant.id,
          action: 'طلب ذاتي من القائمة الإلكترونية',
          entity: 'order',
          entityId: created.id,
          details: `${number} — ${total.toFixed(2)} SAR — ${context.table ? `طاولة ${context.table.name}` : 'سفري'}`
        }
      });
      return created;
    });

    return {
      data: {
        id: order.id,
        number: order.number,
        status: order.status,
        type: order.type,
        tableName: order.table?.name || null,
        subtotal: money(order.subtotal),
        tax: money(order.tax),
        total: money(order.total),
        items: order.items.map((item) => ({ name: item.name, qty: money(item.qty), price: money(item.price) })),
        message: 'تم إرسال طلبك إلى المطبخ. يرجى إتمام الدفع عند الكاشير.'
      }
    };
  }
}

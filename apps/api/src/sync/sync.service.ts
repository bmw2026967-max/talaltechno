import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import type { SyncPushDto } from './dto/sync.dto';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async push(user: AuthUser, dto: SyncPushDto) {
    const accepted: string[] = [];
    const rejected: Array<{ id: string; reason: string }> = [];

    for (const operation of dto.operations) {
      try {
        await this.prisma.syncOperation.create({
          data: {
            tenantId: user.tenantId,
            deviceId: dto.deviceId,
            entity: operation.entity,
            entityType: operation.type,
            entityId: operation.entityId || null,
            payload: {
              ...operation.payload,
              clientOperationId: operation.id,
              clientUpdatedAt: operation.updatedAt,
              sandbox: true
            },
            status: 'SYNCED',
            syncedAt: new Date()
          }
        });
        accepted.push(operation.id);
      } catch (error) {
        rejected.push({
          id: operation.id,
          reason: error instanceof Error ? error.message : 'SYNC_REJECTED'
        });
      }
    }

    return {
      data: {
        accepted,
        rejected,
        serverTime: new Date().toISOString(),
        note: 'تم استلام العمليات في صندوق المزامنة. معالجة المستندات التجارية تتم عبر واجهات البيع/الطلبات.'
      }
    };
  }

  async pull(tenantId: string, since?: string) {
    const threshold = since ? new Date(since) : new Date(0);
    const [products, categories, customers, tables, tenant, pending] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, updatedAt: { gt: threshold } },
        include: { recipe: true, stockLevels: true },
        take: 5000
      }),
      this.prisma.category.findMany({ where: { tenantId }, take: 500 }),
      this.prisma.customer.findMany({ where: { tenantId, updatedAt: { gt: threshold } }, take: 5000 }),
      this.prisma.diningTable.findMany({ where: { tenantId }, take: 500 }),
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.syncOperation.count({ where: { tenantId, status: 'PENDING' } })
    ]);

    const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

    return {
      data: {
        serverTime: new Date().toISOString(),
        since: threshold.toISOString(),
        pendingOperations: pending,
        reference: {
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            nameEn: product.nameEn,
            sku: product.sku,
            type: String(product.type).toLowerCase(),
            price: Number(product.price),
            cost: Number(product.cost),
            taxRate: Number(product.taxRate),
            emoji: product.emoji,
            categoryId: product.categoryId,
            categoryName: product.categoryId ? categoryNames.get(product.categoryId) ?? null : null,
            active: product.active,
            available: product.available,
            recipe: product.recipe.map((line) => ({ materialId: line.materialId, qty: Number(line.qty) })),
            stock: product.stockLevels.reduce((total, level) => total + Number(level.qty), 0),
            updatedAt: product.updatedAt.toISOString()
          })),
          categories,
          customers,
          tables,
          settings: tenant?.settings || {}
        }
      }
    };
  }

  async status(tenantId: string, deviceId?: string) {
    const rows = await this.prisma.syncOperation.groupBy({
      by: ['status'],
      where: { tenantId, ...(deviceId ? { deviceId } : {}) },
      _count: { _all: true }
    });
    return {
      data: {
        counts: Object.fromEntries(rows.map((row) => [String(row.status).toLowerCase(), row._count._all])),
        deviceId: deviceId || null,
        online: true,
        serverTime: new Date().toISOString()
      }
    };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCOUNTS,
  adjustStock,
  availableServings,
  recordWaste,
  round2,
  valuation as inventoryValuation
} from '@talaltechno/domain';
import type { AuthUser } from '../common/types/auth-user';
import type { AdjustmentDto, TransferDto, WasteDto } from './dto/inventory.dto';

const num = (value: unknown) => Number(value || 0);

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async context(user: AuthUser) {
    const branch = user.branchId
      ? await this.prisma.branch.findFirst({ where: { id: user.branchId, tenantId: user.tenantId } })
      : await this.prisma.branch.findFirst({ where: { tenantId: user.tenantId } });
    if (!branch) throw new BadRequestException('لا يوجد فرع مهيّأ للمنشأة.');
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId: user.tenantId, branchId: branch.id }
    });
    if (!warehouse) throw new BadRequestException('لا يوجد مخزن مهيّأ للفرع.');
    return { branch, warehouse };
  }

  private async materialMap(tenantId: string, warehouseId: string) {
    const rows = await this.prisma.product.findMany({
      where: { tenantId, type: 'RAW' },
      include: { stockLevels: { where: { warehouseId } } }
    });
    const map: Record<string, { id: string; name: string; unit: string; cost: number; stock: number }> = {};
    rows.forEach((row) => {
      map[row.id] = {
        id: row.id,
        name: row.name,
        unit: row.unit,
        cost: num(row.cost),
        stock: num(row.stockLevels[0]?.qty)
      };
    });
    return { rows, map };
  }

  async materials(user: AuthUser, search?: string) {
    const { warehouse } = await this.context(user);
    const rows = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        type: 'RAW',
        active: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {})
      },
      include: { stockLevels: { where: { warehouseId: warehouse.id } } },
      orderBy: { name: 'asc' }
    });

    const data = rows.map((row) => {
      const stock = num(row.stockLevels[0]?.qty);
      const minStock = num(row.minStock);
      return {
        id: row.id,
        name: row.name,
        sku: row.sku,
        unit: row.unit,
        cost: num(row.cost),
        stock,
        minStock,
        value: round2(stock * num(row.cost)),
        low: minStock > 0 && stock <= minStock,
        out: stock <= 0
      };
    });

    return {
      data,
      meta: {
        total: data.length,
        low: data.filter((row) => row.low).length,
        out: data.filter((row) => row.out).length,
        value: round2(data.reduce((total, row) => total + row.value, 0))
      }
    };
  }

  async moves(user: AuthUser, limit = 100) {
    const rows = await this.prisma.stockMove.findMany({
      where: { tenantId: user.tenantId },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, Math.max(1, limit))
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.product?.name || '',
        warehouse: row.warehouse?.name || '',
        type: String(row.type).toLowerCase(),
        qty: num(row.qty),
        unitCost: num(row.unitCost),
        value: num(row.value),
        referenceType: row.referenceType,
        referenceNumber: row.referenceNumber,
        note: row.note,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  async valuation(user: AuthUser) {
    const { warehouse } = await this.context(user);
    const { map } = await this.materialMap(user.tenantId, warehouse.id);
    return {
      data: {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        value: inventoryValuation(map),
        materials: Object.values(map).map((material) => ({
          ...material,
          value: round2(material.stock * material.cost)
        }))
      }
    };
  }

  async lowStock(user: AuthUser) {
    const { warehouse } = await this.context(user);
    const { rows } = await this.materialMap(user.tenantId, warehouse.id);
    return {
      data: rows
        .map((row) => ({
          productId: row.id,
          name: row.name,
          unit: row.unit,
          stock: num(row.stockLevels[0]?.qty),
          minStock: num(row.minStock),
          low: num(row.minStock) > 0 && num(row.stockLevels[0]?.qty) <= num(row.minStock)
        }))
        .filter((row) => row.low)
    };
  }

  async availability(user: AuthUser) {
    const { warehouse } = await this.context(user);
    const { map } = await this.materialMap(user.tenantId, warehouse.id);
    const menu = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, type: 'MENU', active: true },
      include: { recipe: true, category: true }
    });

    return {
      data: menu.map((product) => {
        const recipe = product.recipe.map((line) => ({ materialId: line.materialId, qty: num(line.qty) }));
        const servings = recipe.length ? availableServings(recipe, map) : 0;
        return {
          id: product.id,
          name: product.name,
          category: product.category?.name || null,
          recipe,
          availableServings: Math.floor(servings),
          available: product.available && servings >= 1
        };
      })
    };
  }

  private async accountMap(tenantId: string) {
    const rows = await this.prisma.account.findMany({ where: { tenantId } });
    return new Map(rows.map((row) => [row.code, row.id]));
  }

  async waste(user: AuthUser, dto: WasteDto) {
    const { branch, warehouse } = await this.context(user);
    const { map } = await this.materialMap(user.tenantId, warehouse.id);
    if (!map[dto.materialId]) throw new NotFoundException('المادة الخام غير موجودة.');

    let result: any;
    try {
      result = recordWaste(map, dto.materialId, dto.qty, dto.reason || 'هالك', {
        id: `waste_${Date.now()}`,
        number: `WST-${Date.now()}`
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'تعذر تسجيل الهالك.');
    }

    const material = result.materials[dto.materialId];
    const accounts = await this.accountMap(user.tenantId);
    const value = Math.abs(result.move.value);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.stockLevel.upsert({
        where: { warehouseId_productId: { warehouseId: warehouse.id, productId: dto.materialId } },
        update: { qty: material.stock },
        create: { tenantId: user.tenantId, warehouseId: warehouse.id, productId: dto.materialId, qty: material.stock }
      });
      const move = await tx.stockMove.create({
        data: {
          tenantId: user.tenantId,
          warehouseId: warehouse.id,
          productId: dto.materialId,
          type: 'WASTE',
          qty: result.move.qty,
          unitCost: result.move.unitCost,
          value: result.move.value,
          referenceType: 'waste',
          referenceNumber: result.move.referenceNumber,
          note: result.move.note,
          createdById: user.sub
        }
      });
      const waste = await tx.wasteRecord.create({
        data: {
          tenantId: user.tenantId,
          branchId: branch.id,
          warehouseId: warehouse.id,
          productId: dto.materialId,
          qty: dto.qty,
          cost: value,
          reason: dto.reason || 'هالك',
          createdById: user.sub
        }
      });
      if (value > 0 && accounts.has(ACCOUNTS.inventoryLoss) && accounts.has(ACCOUNTS.inventory)) {
        await tx.journalEntry.create({
          data: {
            tenantId: user.tenantId,
            number: `JE-WST-${Date.now()}`,
            date: new Date(new Date().toISOString().slice(0, 10)),
            description: `هالك مخزون — ${material.name}`,
            sourceType: 'waste',
            sourceId: waste.id,
            sourceNumber: `WST-${waste.id.slice(-6)}`,
            totalDebit: value,
            totalCredit: value,
            createdById: user.sub,
            lines: {
              create: [
                { accountId: accounts.get(ACCOUNTS.inventoryLoss)!, debit: value, credit: 0, memo: 'فاقد مخزون' },
                { accountId: accounts.get(ACCOUNTS.inventory)!, debit: 0, credit: value, memo: 'صرف مخزون هالك' }
              ]
            }
          }
        });
      }
      return { move, waste };
    });

    return {
      data: {
        id: created.waste.id,
        materialId: dto.materialId,
        qty: dto.qty,
        value,
        stock: material.stock,
        reason: dto.reason || 'هالك'
      }
    };
  }

  async adjust(user: AuthUser, dto: AdjustmentDto) {
    const { branch, warehouse } = await this.context(user);
    const { map } = await this.materialMap(user.tenantId, warehouse.id);
    if (!map[dto.materialId]) throw new NotFoundException('المادة الخام غير موجودة.');

    let result: any;
    try {
      result = adjustStock(map, dto.materialId, dto.newQty, dto.reason || 'تسوية جرد', {
        id: `adj_${Date.now()}`,
        number: `ADJ-${Date.now()}`
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'تعذر تنفيذ التسوية.');
    }

    const material = result.materials[dto.materialId];
    const accounts = await this.accountMap(user.tenantId);
    const value = Math.abs(result.move.value);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.stockLevel.upsert({
        where: { warehouseId_productId: { warehouseId: warehouse.id, productId: dto.materialId } },
        update: { qty: material.stock },
        create: { tenantId: user.tenantId, warehouseId: warehouse.id, productId: dto.materialId, qty: material.stock }
      });
      const move = await tx.stockMove.create({
        data: {
          tenantId: user.tenantId,
          warehouseId: warehouse.id,
          productId: dto.materialId,
          type: 'ADJUSTMENT',
          qty: result.move.qty,
          unitCost: result.move.unitCost,
          value: result.move.value,
          referenceType: 'adjustment',
          referenceNumber: result.move.referenceNumber,
          note: result.move.note,
          createdById: user.sub
        }
      });
      if (value > 0 && accounts.has(ACCOUNTS.inventoryLoss) && accounts.has(ACCOUNTS.inventory)) {
        const increase = result.move.qty > 0;
        await tx.journalEntry.create({
          data: {
            tenantId: user.tenantId,
            number: `JE-ADJ-${Date.now()}`,
            date: new Date(new Date().toISOString().slice(0, 10)),
            description: `تسوية مخزون — ${material.name}`,
            sourceType: 'adjustment',
            sourceId: move.id,
            sourceNumber: result.move.referenceNumber,
            totalDebit: value,
            totalCredit: value,
            createdById: user.sub,
            lines: {
              create: increase
                ? [
                    { accountId: accounts.get(ACCOUNTS.inventory)!, debit: value, credit: 0, memo: 'زيادة جرد' },
                    { accountId: accounts.get(ACCOUNTS.inventoryLoss)!, debit: 0, credit: value, memo: 'تسوية جرد' }
                  ]
                : [
                    { accountId: accounts.get(ACCOUNTS.inventoryLoss)!, debit: value, credit: 0, memo: 'نقص جرد' },
                    { accountId: accounts.get(ACCOUNTS.inventory)!, debit: 0, credit: value, memo: 'تسوية مخزون' }
                  ]
            }
          }
        });
      }
      return move;
    });

    return {
      data: {
        id: created.id,
        materialId: dto.materialId,
        qty: result.move.qty,
        value: result.move.value,
        stock: material.stock,
        referenceNumber: result.move.referenceNumber
      }
    };
  }

  async transfer(user: AuthUser, dto: TransferDto) {
    const { warehouse } = await this.context(user);
    const fromId = dto.fromWarehouseId || warehouse.id;
    if (fromId === dto.toWarehouseId) throw new BadRequestException('لا يمكن التحويل إلى نفس المخزن.');

    const [from, to, product, sourceLevel] = await Promise.all([
      this.prisma.warehouse.findFirst({ where: { id: fromId, tenantId: user.tenantId } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.toWarehouseId, tenantId: user.tenantId } }),
      this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId, type: 'RAW' } }),
      this.prisma.stockLevel.findUnique({ where: { warehouseId_productId: { warehouseId: fromId, productId: dto.productId } } })
    ]);
    if (!from) throw new NotFoundException('المخزن المصدر غير موجود.');
    if (!to) throw new NotFoundException('المخزن الهدف غير موجود.');
    if (!product) throw new NotFoundException('المادة الخام غير موجودة.');

    const available = num(sourceLevel?.qty);
    if (available < dto.qty) throw new BadRequestException(`الرصيد المتاح ${available} ${product.unit} فقط.`);

    const cost = num(product.cost);
    const value = round2(dto.qty * cost);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.stockLevel.update({
        where: { warehouseId_productId: { warehouseId: fromId, productId: dto.productId } },
        data: { qty: available - dto.qty }
      });
      const target = await tx.stockLevel.findUnique({
        where: { warehouseId_productId: { warehouseId: dto.toWarehouseId, productId: dto.productId } }
      });
      await tx.stockLevel.upsert({
        where: { warehouseId_productId: { warehouseId: dto.toWarehouseId, productId: dto.productId } },
        update: { qty: num(target?.qty) + dto.qty },
        create: { tenantId: user.tenantId, warehouseId: dto.toWarehouseId, productId: dto.productId, qty: dto.qty }
      });
      const referenceNumber = `TRF-${Date.now()}`;
      await tx.stockMove.createMany({
        data: [
          {
            tenantId: user.tenantId,
            warehouseId: fromId,
            productId: dto.productId,
            type: 'TRANSFER_OUT',
            qty: -dto.qty,
            unitCost: cost,
            value: -value,
            referenceType: 'transfer',
            referenceNumber,
            note: dto.note || `تحويل إلى ${to.name}`,
            createdById: user.sub
          },
          {
            tenantId: user.tenantId,
            warehouseId: dto.toWarehouseId,
            productId: dto.productId,
            type: 'TRANSFER_IN',
            qty: dto.qty,
            unitCost: cost,
            value,
            referenceType: 'transfer',
            referenceNumber,
            note: dto.note || `تحويل من ${from.name}`,
            createdById: user.sub
          }
        ]
      });
      return { referenceNumber };
    });

    return {
      data: {
        productId: dto.productId,
        fromWarehouseId: fromId,
        toWarehouseId: dto.toWarehouseId,
        qty: dto.qty,
        value,
        referenceNumber: created.referenceNumber
      }
    };
  }
}

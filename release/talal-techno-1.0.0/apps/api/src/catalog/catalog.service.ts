import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto';

const money = (value: unknown) => Number(value || 0);

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listProducts(tenantId: string, query: { type?: string; categoryId?: string; search?: string }) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        active: true,
        ...(query.type ? { type: query.type.toUpperCase() as 'MENU' | 'RAW' } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.search
          ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { sku: { contains: query.search, mode: 'insensitive' } }, { barcode: { contains: query.search } }] }
          : {})
      },
      include: {
        category: true,
        recipe: { include: { material: true } },
        stockLevels: true
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });

    // Menu items have no stock rows of their own; availability is derived from
    // the raw materials in their recipe, so aggregate every stock level.
    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { tenantId },
      select: { productId: true, qty: true }
    });
    const stockByProduct = new Map<string, number>();
    stockLevels.forEach((level) => {
      stockByProduct.set(level.productId, (stockByProduct.get(level.productId) || 0) + money(level.qty));
    });

    return {
      data: products.map((product) => this.toDto(product, stockByProduct)),
      meta: { total: products.length }
    };
  }

  private toDto(product: any, stockByProduct: Map<string, number>) {
    const recipe = (product.recipe || []).map((line: any) => ({
      materialId: line.materialId,
      materialName: line.material?.name,
      qty: money(line.qty),
      unit: line.material?.unit,
      cost: money(line.material?.cost)
    }));

    let available = product.available && product.active;
    if (product.type === 'MENU' && recipe.length) {
      const servings = Math.min(...recipe.map((line: any) => {
        const stock = stockByProduct.get(line.materialId) || 0;
        return line.qty > 0 ? stock / line.qty : 0;
      }));
      available = available && servings >= 1;
    } else if (product.type === 'RAW') {
      available = available && (stockByProduct.get(product.id) || 0) > 0;
    }

    return {
      id: product.id,
      categoryId: product.categoryId,
      categoryName: product.category?.name || null,
      name: product.name,
      nameEn: product.nameEn,
      sku: product.sku,
      barcode: product.barcode,
      type: product.type.toLowerCase(),
      price: money(product.price),
      cost: money(product.cost),
      taxRate: money(product.taxRate),
      unit: product.unit,
      emoji: product.emoji,
      active: product.active,
      available,
      minStock: money(product.minStock),
      stock: stockByProduct.get(product.id) || 0,
      recipe
    };
  }

  async createProduct(tenantId: string, dto: CreateProductDto) {
    if (dto.type === 'menu' && (!dto.recipe || dto.recipe.length === 0)) {
      throw new BadRequestException('صنف القائمة يتطلب وصفة BOM واحدة على الأقل.');
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({ where: { id: dto.categoryId, tenantId } });
      if (!category) throw new NotFoundException('الفئة غير موجودة.');
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        categoryId: dto.categoryId || null,
        name: dto.name,
        nameEn: dto.nameEn || null,
        sku: dto.sku,
        barcode: dto.barcode || null,
        type: dto.type.toUpperCase() as 'MENU' | 'RAW',
        price: dto.price,
        cost: dto.cost || 0,
        taxRate: dto.taxRate ?? 15,
        unit: dto.unit || 'حبة',
        emoji: dto.emoji || null,
        minStock: dto.minStock || 0,
        active: dto.active !== false,
        recipe: dto.recipe
          ? { create: dto.recipe.map((line) => ({ materialId: line.materialId, qty: line.qty })) }
          : undefined
      },
      include: { recipe: { include: { material: true } }, category: true, stockLevels: true }
    });

    return { data: this.toDto(product, new Map()) };
  }

  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('الصنف غير موجود.');

    const product = await this.prisma.$transaction(async (tx) => {
      if (dto.recipe) {
        await tx.recipeLine.deleteMany({ where: { productId: id } });
        await tx.recipeLine.createMany({
          data: dto.recipe.map((line) => ({ productId: id, materialId: line.materialId, qty: line.qty }))
        });
      }
      return tx.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId || null } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
          ...(dto.taxRate !== undefined ? { taxRate: dto.taxRate } : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
          ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
          ...(dto.minStock !== undefined ? { minStock: dto.minStock } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(dto.available !== undefined ? { available: dto.available } : {})
        },
        include: { recipe: { include: { material: true } }, category: true, stockLevels: true }
      });
    });

    return { data: this.toDto(product, new Map()) };
  }

  async listCategories(tenantId: string) {
    const rows = await this.prisma.category.findMany({
      where: { tenantId, active: true },
      orderBy: { sort: 'asc' }
    });
    return { data: rows };
  }

  async listTables(tenantId: string) {
    const rows = await this.prisma.diningTable.findMany({
      where: { tenantId, active: true },
      orderBy: [{ zone: 'asc' }, { name: 'asc' }]
    });
    return { data: rows };
  }

  async listCustomers(tenantId: string, search?: string) {
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId,
        active: true,
        ...(search
          ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { code: { contains: search, mode: 'insensitive' } }] }
          : {})
      },
      orderBy: { name: 'asc' },
      take: 200
    });
    return { data: rows };
  }
}

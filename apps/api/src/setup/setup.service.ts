import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import type { SetupDto } from './dto/setup.dto';

const CHART = [
  ['1101', 'الصندوق (النقدية)', 'ASSET'],
  ['1102', 'البنك / مدى', 'ASSET'],
  ['1103', 'العملاء (المدينون)', 'ASSET'],
  ['1104', 'المخزون', 'ASSET'],
  ['1105', 'ضريبة القيمة المضافة - مشتريات', 'ASSET'],
  ['1201', 'الأصول الثابتة', 'ASSET'],
  ['2101', 'الموردون (الدائنون)', 'LIABILITY'],
  ['2102', 'ضريبة القيمة المضافة - مبيعات', 'LIABILITY'],
  ['2103', 'رواتب مستحقة', 'LIABILITY'],
  ['3101', 'رأس المال', 'EQUITY'],
  ['3102', 'الأرباح المحتجزة', 'EQUITY'],
  ['4101', 'إيرادات المبيعات', 'REVENUE'],
  ['4102', 'إيرادات التوصيل (تطبيقات / منصات)', 'REVENUE'],
  ['4103', 'إيرادات أخرى', 'REVENUE'],
  ['4104', 'خصم مسموح به', 'REVENUE'],
  ['5101', 'تكلفة المواد المباعة', 'EXPENSE'],
  ['5102', 'مصروفات التشغيل', 'EXPENSE'],
  ['5103', 'الإيجارات', 'EXPENSE'],
  ['5108', 'رواتب الموظفين', 'EXPENSE'],
  ['5109', 'مصروفات متنوعة', 'EXPENSE']
] as const;

const CATEGORIES = ['مقبلات', 'سلطات', 'مشاوي', 'وجبات رئيسية', 'حلويات', 'مشروبات'];

@Injectable()
export class SetupService {
  constructor(private readonly prisma: PrismaService) {}

  async isInitialized(): Promise<boolean> {
    const count = await this.prisma.tenant.count();
    return count > 0;
  }

  async setup(dto: SetupDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } });
    if (existing) throw new ConflictException('يوجد مستأجر بهذا الرمز مسبقاً. اختر رمزاً آخر.');
    const anyTenant = await this.prisma.tenant.count();
    if (anyTenant > 0) throw new ConflictException('النظام مُهيّأ مسبقاً. سجّل الدخول.');

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);
    const branchName = dto.branchName || 'الفرع الرئيسي';
    const city = dto.city || 'الرياض';

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
          email: dto.ownerEmail,
          city,
          settings: {
            brand: dto.tenantName,
            invoicePrefix: 'TT',
            receiptFooter: `شكراً لزيارتكم — ${dto.tenantName}`,
            serviceChargeRate: 0,
            loyalty: { earnPerSar: 1, redeemValue: 0.05 },
            emenu: { enabled: true, allowSelfOrder: true, requireTable: false, welcomeText: `أهلاً بكم في ${dto.tenantName}.` }
          }
        }
      });
      const branch = await tx.branch.create({
        data: { tenantId: tenant.id, name: branchName, code: 'BR-01', address: city }
      });
      const warehouse = await tx.warehouse.create({
        data: { tenantId: tenant.id, branchId: branch.id, name: 'المخزن الرئيسي', code: 'WH-01' }
      });
      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: dto.ownerName,
          email: dto.ownerEmail.toLowerCase().trim(),
          role: 'OWNER',
          passwordHash
        }
      });
      for (const [code, name, type] of CHART) {
        await tx.account.create({ data: { tenantId: tenant.id, code, name, type: type as any } });
      }
      for (const [index, categoryName] of CATEGORIES.entries()) {
        await tx.category.create({ data: { tenantId: tenant.id, name: categoryName, sort: index + 1 } });
      }
      for (let i = 0; i < 10; i++) {
        const number = String(i + 1).padStart(2, '0');
        await tx.diningTable.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: `T${number}`,
            zone: i < 4 ? 'الصالة الرئيسية' : i < 7 ? 'العائلات' : 'الحديقة',
            seats: i < 7 ? 4 : 6,
            qrToken: `${dto.tenantSlug}-t${number.toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`
          }
        });
      }
      await tx.device.create({
        data: { tenantId: tenant.id, branchId: branch.id, name: 'نقطة بيع 1', type: 'POS', serial: 'POS-001' }
      });
      await tx.auditLog.create({
        data: { tenantId: tenant.id, userId: owner.id, action: 'تهيئة منشأة جديدة', entity: 'tenant', entityId: tenant.id, details: `Slug: ${dto.tenantSlug}` }
      });
      return { tenant, branch, warehouse, owner };
    });

    return {
      data: {
        tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
        branch: { id: result.branch.id, name: result.branch.name, code: result.branch.code },
        owner: { id: result.owner.id, name: result.owner.name, email: result.owner.email, role: 'OWNER' },
        message: 'تم إنشاء المنشأة. سجّل الدخول الآن.'
      }
    };
  }
}

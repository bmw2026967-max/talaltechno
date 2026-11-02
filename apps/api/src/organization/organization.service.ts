import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../common/types/auth-user';
import type { UpdateSettingsDto } from './dto/organization.dto';
import type { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(tenantId: string) {
    const [tenant, branches, warehouses, devices, users] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.branch.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
      this.prisma.warehouse.findMany({ where: { tenantId }, include: { branch: true }, orderBy: { name: 'asc' } }),
      this.prisma.device.findMany({ where: { tenantId }, include: { branch: true }, orderBy: { name: 'asc' } }),
      this.prisma.user.findMany({ where: { tenantId }, include: { branch: true }, orderBy: { name: 'asc' } })
    ]);
    if (!tenant) throw new NotFoundException('المنشأة غير موجودة.');
    return {
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          vatNumber: tenant.vatNumber,
          crNumber: tenant.crNumber,
          email: tenant.email,
          phone: tenant.phone,
          address: tenant.address,
          city: tenant.city,
          timezone: tenant.timezone,
          currency: tenant.currency,
          vatRate: Number(tenant.vatRate),
          settings: tenant.settings
        },
        branches: branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          address: branch.address,
          phone: branch.phone,
          active: branch.active
        })),
        warehouses: warehouses.map((warehouse) => ({
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
          branchName: warehouse.branch?.name || ''
        })),
        devices: devices.map((device) => ({
          id: device.id,
          name: device.name,
          type: String(device.type).toLowerCase(),
          serial: device.serial,
          branchName: device.branch?.name || '',
          lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null
        })),
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: String(user.role).toLowerCase(),
          branchName: user.branch?.name || '',
          active: user.active,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null
        }))
      }
    };
  }

  async branches(tenantId: string) {
    const rows = await this.prisma.branch.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
    return { data: rows };
  }

  async users(tenantId: string) {
    const rows = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        lastLoginAt: true,
        branch: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });
    return { data: rows };
  }

  async createUser(tenantId: string, dto: CreateUserDto, actorRole: string) {
    if (!['OWNER', 'ADMIN'].includes(actorRole)) throw new ForbiddenException('غير مصرح.');
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم مسبقاً في هذه المنشأة.');
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId } });
      if (!branch) throw new NotFoundException('الفرع غير موجود.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        branchId: dto.branchId || null,
        name: dto.name,
        email,
        phone: dto.phone || null,
        role: (dto.role || 'CASHIER') as any,
        passwordHash
      },
      include: { branch: { select: { id: true, name: true } } }
    });
    return {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: String(user.role).toLowerCase(),
        branchName: user.branch?.name || '',
        active: user.active
      }
    };
  }

  async devices(tenantId: string) {
    const rows = await this.prisma.device.findMany({
      where: { tenantId },
      include: { branch: true },
      orderBy: { name: 'asc' }
    });
    return { data: rows };
  }

  async settings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('المنشأة غير موجودة.');
    return {
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        vatNumber: tenant.vatNumber,
        crNumber: tenant.crNumber,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
        city: tenant.city,
        timezone: tenant.timezone,
        currency: tenant.currency,
        vatRate: Number(tenant.vatRate),
        settings: tenant.settings
      }
    };
  }

  async updateSettings(user: AuthUser, dto: UpdateSettingsDto) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: user.tenantId } });
    if (!tenant) throw new NotFoundException('المنشأة غير موجودة.');
    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.vatNumber !== undefined ? { vatNumber: dto.vatNumber } : {}),
        ...(dto.crNumber !== undefined ? { crNumber: dto.crNumber } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.settings !== undefined ? { settings: dto.settings as any } : {})
      }
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'تحديث إعدادات المنشأة',
        entity: 'tenant',
        entityId: tenant.id,
        details: 'تحديث بيانات المنشأة'
      }
    });
    return { data: { id: updated.id, name: updated.name, settings: updated.settings } };
  }
}

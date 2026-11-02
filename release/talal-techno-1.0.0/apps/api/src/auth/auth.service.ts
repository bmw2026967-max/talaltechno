import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { Role } from '@talaltechno/shared-types';

const PERMISSIONS: Record<Role, string[]> = {
  OWNER: ['*'],
  ADMIN: ['*'],
  MANAGER: [
    'dashboard:read', 'catalog:*', 'orders:*', 'sales:*', 'shifts:*',
    'inventory:*', 'accounting:read', 'reports:read', 'loyalty:*', 'integrations:*'
  ],
  CASHIER: ['dashboard:read', 'catalog:read', 'orders:*', 'sales:create', 'sales:read', 'shifts:open', 'shifts:close', 'customers:read'],
  WAITER: ['catalog:read', 'orders:*', 'tables:*', 'customers:read'],
  KITCHEN: ['catalog:read', 'orders:read', 'orders:status', 'inventory:read'],
  ACCOUNTANT: ['dashboard:read', 'accounting:*', 'reports:*', 'sales:read', 'purchases:*', 'inventory:read', 'zatca:*'],
  DELIVERY_MANAGER: ['dashboard:read', 'orders:read', 'orders:status', 'delivery:*', 'integrations:delivery']
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: LoginDto) {
    const tenant = dto.tenantSlug
      ? await this.prisma.tenant.findUnique({ where: { slug: dto.tenantSlug } })
      : null;

    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase().trim(),
        active: true,
        ...(tenant ? { tenantId: tenant.id } : {})
      },
      include: { tenant: true, branch: true }
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة.');
    }
    if (user.tenant.active === false) {
      throw new UnauthorizedException('حساب المنشأة غير مفعّل.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة.');
    }

    const role = user.role as Role;
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      name: user.name,
      email: user.email,
      role,
      permissions: PERMISSIONS[role] || []
    };

    const accessToken = await this.jwt.signAsync(payload);
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') || '8h';

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'تسجيل دخول',
        entity: 'user',
        entityId: user.id,
        details: `الدور: ${role}`
      }
    });

    return {
      data: {
        accessToken,
        expiresIn,
        user: {
          id: user.id,
          tenantId: user.tenantId,
          branchId: user.branchId,
          name: user.name,
          email: user.email,
          role,
          permissions: payload.permissions,
          tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug, vatNumber: user.tenant.vatNumber },
          branch: user.branch ? { id: user.branch.id, name: user.branch.name } : null
        }
      }
    };
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { SalesModule } from './sales/sales.module';
import { ShiftsModule } from './shifts/shifts.module';
import { InventoryModule } from './inventory/inventory.module';
import { AccountingModule } from './accounting/accounting.module';
import { ZatcaModule } from './zatca/zatca.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrganizationModule } from './organization/organization.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { CrmModule } from './crm/crm.module';
import { SyncModule } from './sync/sync.module';
import { PublicModule } from './public/public.module';
import { SetupModule } from './setup/setup.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    AuthModule,
    HealthModule,
    CatalogModule,
    OrdersModule,
    SalesModule,
    ShiftsModule,
    InventoryModule,
    AccountingModule,
    ZatcaModule,
    IntegrationsModule,
    DashboardModule,
    OrganizationModule,
    PurchasingModule,
    CrmModule,
    SyncModule,
    PublicModule,
    SetupModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule {}

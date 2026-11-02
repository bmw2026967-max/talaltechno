import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  stats(@CurrentUser() user: AuthUser) {
    return this.dashboard.stats(user.tenantId);
  }

  @Get('sales-trend')
  trend(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.dashboard.salesTrend(user.tenantId, days ? Number(days) : 7);
  }

  @Get('top-products')
  topProducts(
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
    @Query('limit') limit?: string
  ) {
    return this.dashboard.topProducts(user.tenantId, days ? Number(days) : 30, limit ? Number(limit) : 8);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser) {
    return this.dashboard.recent(user.tenantId);
  }
}

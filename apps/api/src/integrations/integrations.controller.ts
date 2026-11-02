import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { ChargeDto, DeliveryStatusDto, PullDeliveryDto } from './dto/integration.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.integrations.list(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT')
  @Post('payments/charge')
  charge(@CurrentUser() user: AuthUser, @Body() dto: ChargeDto) {
    return this.integrations.charge(user, dto);
  }

  @Get('payments/transactions')
  transactions(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.integrations.transactions(user.tenantId, limit ? Number(limit) : 50);
  }

  @Get('delivery/orders')
  deliveryOrders(@CurrentUser() user: AuthUser, @Query('platform') platform?: string) {
    return this.integrations.deliveryOrders(user.tenantId, platform);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'DELIVERY_MANAGER')
  @Post('delivery/pull')
  pull(@CurrentUser() user: AuthUser, @Body() dto: PullDeliveryDto) {
    return this.integrations.pullDelivery(user, dto.platform);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'DELIVERY_MANAGER', 'CASHIER')
  @Patch('delivery/orders/:id/status')
  deliveryStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DeliveryStatusDto) {
    return this.integrations.updateDeliveryStatus(user, id, dto.status);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Post('printer/test')
  printerTest(@CurrentUser() user: AuthUser) {
    return this.integrations.printerTest(user);
  }

  @Get('printer/jobs')
  printerJobs(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.integrations.printerJobs(user.tenantId, limit ? Number(limit) : 50);
  }
}

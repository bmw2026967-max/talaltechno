import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { AdjustLoyaltyDto, CreateCouponDto, CreateCustomerDto } from './dto/crm.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('crm')
@ApiBearerAuth()
@Controller()
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('crm/customers')
  customers(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.crm.customers(user.tenantId, search);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Post('crm/customers')
  createCustomer(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    return this.crm.createCustomer(user, dto);
  }

  @Get('crm/customers/:id/loyalty')
  loyalty(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.crm.loyalty(user.tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Post('crm/customers/:id/loyalty')
  adjustLoyalty(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AdjustLoyaltyDto) {
    return this.crm.adjustLoyalty(user, id, dto);
  }

  @Get('crm/coupons')
  coupons(@CurrentUser() user: AuthUser) {
    return this.crm.coupons(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Post('crm/coupons')
  createCoupon(@CurrentUser() user: AuthUser, @Body() dto: CreateCouponDto) {
    return this.crm.createCoupon(user, dto);
  }
}

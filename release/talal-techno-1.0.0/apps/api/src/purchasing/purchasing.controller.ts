import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { CreatePurchaseOrderDto, CreateSupplierDto } from './dto/purchasing.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('purchasing')
@ApiBearerAuth()
@Controller()
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  @Get('suppliers')
  suppliers(@CurrentUser() user: AuthUser) {
    return this.purchasing.suppliers(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @Post('suppliers')
  createSupplier(@CurrentUser() user: AuthUser, @Body() dto: CreateSupplierDto) {
    return this.purchasing.createSupplier(user, dto);
  }

  @Get('purchase-orders')
  orders(@CurrentUser() user: AuthUser) {
    return this.purchasing.orders(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @Post('purchase-orders')
  createOrder(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchasing.createOrder(user, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @Post('purchase-orders/:id/receive')
  receive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.purchasing.receive(user, id);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  AddOrderItemsDto,
  CreateOrderDto,
  SplitOrderDto,
  TransferOrderDto,
  UpdateOrderStatusDto
} from './dto/order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string, @Query('platform') platform?: string) {
    return this.orders.list(user.tenantId, { status, platform });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.get(user.tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'DELIVERY_MANAGER')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'DELIVERY_MANAGER')
  @Patch(':id/status')
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.setStatus(user, id, dto.status);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @Post(':id/items')
  addItems(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddOrderItemsDto) {
    return this.orders.addItems(user, id, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @Patch(':id/table')
  transfer(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TransferOrderDto) {
    return this.orders.transfer(user, id, dto.tableId);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Post(':id/split')
  split(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SplitOrderDto) {
    return this.orders.split(user, id, dto.itemIds);
  }
}

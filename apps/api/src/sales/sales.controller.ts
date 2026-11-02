import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateReturnDto, CreateSaleDto } from './dto/sale.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.sales.list(user.tenantId, {
      from,
      to,
      type,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50
    });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sales.get(user.tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSaleDto) {
    return this.sales.create(user, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Post(':id/returns')
  createReturn(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateReturnDto) {
    return this.sales.createReturn(user, id, dto);
  }
}

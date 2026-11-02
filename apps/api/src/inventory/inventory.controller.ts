import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustmentDto, TransferDto, WasteDto } from './dto/inventory.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('materials')
  materials(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.inventory.materials(user, search);
  }

  @Get('moves')
  moves(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.inventory.moves(user, limit ? Number(limit) : 100);
  }

  @Get('valuation')
  valuation(@CurrentUser() user: AuthUser) {
    return this.inventory.valuation(user);
  }

  @Get('low-stock')
  lowStock(@CurrentUser() user: AuthUser) {
    return this.inventory.lowStock(user);
  }

  @Get('availability')
  availability(@CurrentUser() user: AuthUser) {
    return this.inventory.availability(user);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'KITCHEN')
  @Post('waste')
  waste(@CurrentUser() user: AuthUser, @Body() dto: WasteDto) {
    return this.inventory.waste(user, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @Post('adjustments')
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustmentDto) {
    return this.inventory.adjust(user, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Post('transfers')
  transfer(@CurrentUser() user: AuthUser, @Body() dto: TransferDto) {
    return this.inventory.transfer(user, dto);
  }
}

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ZatcaService } from './zatca.service';
import { ReportZatcaDto } from './dto/zatca.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('zatca')
@ApiBearerAuth()
@Controller('zatca')
export class ZatcaController {
  constructor(private readonly zatca: ZatcaService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.zatca.status(user.tenantId);
  }

  @Get('invoices')
  invoices(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.zatca.invoices(user.tenantId, page ? Number(page) : 1, pageSize ? Number(pageSize) : 50);
  }

  @Get('invoices/:id')
  invoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.zatca.invoice(user.tenantId, id);
  }

  @Get('chain/verify')
  verify(@CurrentUser() user: AuthUser) {
    return this.zatca.verify(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
  @Post('invoices/:id/report')
  report(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReportZatcaDto) {
    return this.zatca.report(user, id, dto.status);
  }
}

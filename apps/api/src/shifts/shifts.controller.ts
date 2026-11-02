import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CloseShiftDto, OpenShiftDto } from './dto/shift.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.shifts.list(user.tenantId, status);
  }

  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.shifts.current(user);
  }

  @Get(':id/summary')
  summary(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.shifts.summary(user.tenantId, id);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Post('open')
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenShiftDto) {
    return this.shifts.open(user, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER')
  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CloseShiftDto) {
    return this.shifts.close(user, id, dto);
  }
}

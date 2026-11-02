import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  push(@CurrentUser() user: AuthUser, @Body() dto: SyncPushDto) {
    return this.sync.push(user, dto);
  }

  @Get('pull')
  pull(@CurrentUser() user: AuthUser, @Query('since') since?: string) {
    return this.sync.pull(user.tenantId, since);
  }

  @Get('status')
  status(@CurrentUser() user: AuthUser, @Query('deviceId') deviceId?: string) {
    return this.sync.status(user.tenantId, deviceId);
  }
}

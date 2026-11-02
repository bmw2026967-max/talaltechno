import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { UpdateSettingsDto } from './dto/organization.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('organization')
@ApiBearerAuth()
@Controller()
export class OrganizationController {
  constructor(private readonly organization: OrganizationService) {}

  @Get('organization')
  overview(@CurrentUser() user: AuthUser) {
    return this.organization.overview(user.tenantId);
  }

  @Get('branches')
  branches(@CurrentUser() user: AuthUser) {
    return this.organization.branches(user.tenantId);
  }

  @Get('users')
  users(@CurrentUser() user: AuthUser) {
    return this.organization.users(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN')
  @Post('users')
  createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.organization.createUser(user.tenantId, dto, user.role);
  }

  @Get('devices')
  devices(@CurrentUser() user: AuthUser) {
    return this.organization.devices(user.tenantId);
  }

  @Get('settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.organization.settings(user.tenantId);
  }

  @Roles('OWNER', 'ADMIN')
  @Patch('settings')
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.organization.updateSettings(user, dto);
  }
}

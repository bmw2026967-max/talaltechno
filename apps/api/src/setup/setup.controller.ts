import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SetupService } from './setup.service';
import { SetupDto } from './dto/setup.dto';
import { Public } from '../common/decorators/roles.decorator';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Public()
  @Get('status')
  async status() {
    const initialized = await this.setupService.isInitialized();
    return { data: { initialized } };
  }

  @Public()
  @Post()
  async create(@Body() dto: SetupDto) {
    return this.setupService.setup(dto);
  }
}

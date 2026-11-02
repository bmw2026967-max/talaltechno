import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { CreatePublicOrderDto } from './dto/public-order.dto';
import { Public } from '../common/decorators/roles.decorator';

@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('menu')
  menu(@Query('table') table?: string, @Query('branch') branch?: string) {
    return this.publicService.menu(table, branch);
  }

  @Post('orders')
  createOrder(@Body() dto: CreatePublicOrderDto) {
    return this.publicService.createOrder(dto);
  }
}

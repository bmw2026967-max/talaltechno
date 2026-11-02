import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/types/auth-user';

@ApiTags('catalog')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  products(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string
  ) {
    if (type && !['menu', 'raw'].includes(type)) {
      throw new BadRequestException('نوع الصنف يجب أن يكون menu أو raw.');
    }
    return this.catalog.listProducts(user.tenantId, { type, categoryId, search });
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Post('products')
  createProduct(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.catalog.createProduct(user.tenantId, dto);
  }

  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Patch('products/:id')
  updateProduct(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalog.updateProduct(user.tenantId, id, dto);
  }

  @Get('categories')
  categories(@CurrentUser() user: AuthUser) {
    return this.catalog.listCategories(user.tenantId);
  }

  @Get('tables')
  tables(@CurrentUser() user: AuthUser) {
    return this.catalog.listTables(user.tenantId);
  }

  @Get('customers')
  customers(@CurrentUser() user: AuthUser, @Query('search') search?: string) {
    return this.catalog.listCustomers(user.tenantId, search);
  }
}

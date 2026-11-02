import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() address?: string;
}

export class PurchaseItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId!: string;

  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}

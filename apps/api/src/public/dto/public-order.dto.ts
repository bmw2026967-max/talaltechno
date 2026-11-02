import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';

export class PublicOrderItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.001)
  qty!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;
}

export class CreatePublicOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  table?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  branch?: string;

  @IsIn(['dine_in', 'takeaway'])
  type!: 'dine_in' | 'takeaway';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PublicOrderItemDto)
  items!: PublicOrderItemDto[];
}

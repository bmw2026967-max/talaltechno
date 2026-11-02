import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator';

export const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery', 'curbside'] as const;
export const ORDER_STATUSES = ['new', 'preparing', 'ready', 'served', 'completed', 'cancelled'] as const;

export class OrderItemInput {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.001)
  qty!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  station?: string;
}

export class CreateOrderDto {
  @IsIn(ORDER_TYPES)
  type!: (typeof ORDER_TYPES)[number];

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  platformName?: string;

  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}

export class AddOrderItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items!: OrderItemInput[];
}

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: (typeof ORDER_STATUSES)[number];
}

export class TransferOrderDto {
  @IsString()
  tableId!: string;
}

export class SplitOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemIds!: string[];
}

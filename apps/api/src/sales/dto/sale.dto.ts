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

export const PAYMENT_METHODS = [
  'cash', 'mada', 'applepay', 'stcpay', 'visa', 'mastercard', 'card', 'bank', 'credit', 'wallet', 'mixed'
] as const;

export const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery', 'curbside'] as const;

export class SaleItemDto {
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
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SalePaymentDto {
  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments?: SalePaymentDto[];

  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() customerPhone?: string;

  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsNumber() @Min(0) serviceCharge?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryFee?: number;

  @IsOptional() @IsString() couponCode?: string;
  @IsOptional() @IsInt() @Min(0) loyaltyPoints?: number;

  @IsOptional() @IsIn(ORDER_TYPES) orderType?: (typeof ORDER_TYPES)[number];
  @IsOptional() @IsString() tableId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() shiftId?: string;

  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsIn(['pos', 'qmenu', 'delivery', 'api']) source?: 'pos' | 'qmenu' | 'delivery' | 'api';
}

export class ReturnItemDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(0.001)
  qty!: number;
}

export class CreateReturnDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  refundMethod?: (typeof PAYMENT_METHODS)[number];

  @IsOptional() @IsString() notes?: string;
}

import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() address?: string;
}

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsIn(['percent', 'fixed'])
  type!: 'percent' | 'fixed';

  @IsNumber()
  @Min(0.01)
  value!: number;

  @IsOptional() @IsNumber() @Min(0) minSpend?: number;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class AdjustLoyaltyDto {
  @IsInt()
  points!: number;

  @IsString()
  note!: string;
}

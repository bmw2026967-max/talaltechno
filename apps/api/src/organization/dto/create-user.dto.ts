import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import type { Role } from '@talaltechno/shared-types';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'كلمة المرور 8 أحرف على الأقل.' })
  password!: string;

  @IsOptional()
  @IsEnum(['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'ACCOUNTANT', 'DELIVERY_MANAGER'])
  role?: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}

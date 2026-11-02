import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator';

export const PAYMENT_METHODS = ['cash', 'mada', 'applepay', 'stcpay', 'visa', 'mastercard', 'card', 'bank', 'credit', 'wallet'] as const;

export class JournalLineDto {
  @IsString()
  accountId!: string;

  @IsNumber()
  @Min(0)
  debit!: number;

  @IsNumber()
  @Min(0)
  credit!: number;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class CreateJournalDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class CreateExpenseDto {
  @IsString()
  category!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;
}

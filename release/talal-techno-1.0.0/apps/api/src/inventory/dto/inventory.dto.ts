import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class WasteDto {
  @IsString()
  materialId!: string;

  @IsNumber()
  @Min(0.0001, { message: 'كمية الهالك يجب أن تكون أكبر من صفر.' })
  qty!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdjustmentDto {
  @IsString()
  materialId!: string;

  @IsNumber()
  @Min(0, { message: 'الرصيد الجديد لا يمكن أن يكون سالباً.' })
  newQty!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  fromWarehouseId?: string;

  @IsString()
  toWarehouseId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

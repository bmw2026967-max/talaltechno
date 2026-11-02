import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenShiftDto {
  @IsNumber()
  @Min(0, { message: 'النقدية الافتتاحية لا يمكن أن تكون سالبة.' })
  openingCash!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftDto {
  @IsNumber()
  @Min(0, { message: 'النقدية المعدودة لا يمكن أن تكون سالبة.' })
  countedCash!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

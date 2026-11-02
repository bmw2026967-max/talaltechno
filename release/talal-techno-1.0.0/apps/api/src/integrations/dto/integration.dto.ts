import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export const PAYMENT_PROVIDERS = ['hyperpay', 'geidea', 'moyasar', 'paytabs'] as const;
export const DELIVERY_PROVIDERS = ['hungerstation', 'jahez', 'mrsool', 'toyou', 'careem'] as const;

export class ChargeDto {
  @IsIn(PAYMENT_PROVIDERS)
  provider!: (typeof PAYMENT_PROVIDERS)[number];

  @IsString()
  method!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class PullDeliveryDto {
  @IsIn(DELIVERY_PROVIDERS)
  platform!: (typeof DELIVERY_PROVIDERS)[number];
}

export class DeliveryStatusDto {
  @IsString()
  status!: string;
}

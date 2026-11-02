import { IsIn, IsOptional } from 'class-validator';

export const ZATCA_STATUSES = ['REPORTED', 'CLEARED', 'PENDING', 'REJECTED'] as const;

export class ReportZatcaDto {
  @IsIn(ZATCA_STATUSES)
  status!: (typeof ZATCA_STATUSES)[number];
}

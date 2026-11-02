import { IsEmail, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class SetupDto {
  @IsString()
  @MinLength(2)
  tenantName!: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{2,48}$/, { message: 'الرمز يقبل الأحرف اللاتينية الصغيرة والأرقام والشرطة (3–49).' })
  tenantSlug!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح.' })
  ownerEmail!: string;

  @IsString()
  @MinLength(8, { message: 'كلمة المرور 8 أحرف على الأقل.' })
  ownerPassword!: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

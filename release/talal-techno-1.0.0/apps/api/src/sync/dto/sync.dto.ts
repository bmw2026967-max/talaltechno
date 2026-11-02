import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export class SyncOperationDto {
  @IsString()
  id!: string;

  @IsString()
  entity!: string;

  @IsIn(['create', 'update', 'delete'])
  type!: 'create' | 'update' | 'delete';

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsString()
  updatedAt!: string;
}

export class SyncPushDto {
  @IsString()
  deviceId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}

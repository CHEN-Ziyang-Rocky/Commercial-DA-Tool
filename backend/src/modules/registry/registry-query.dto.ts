import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  ArrayMaxSize,
  Matches,
  ValidateIf,
} from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
const Optional = () => ValidateIf((_object, value) => value !== undefined);
export class RegistryQueryDto extends PaginationDto {
  @Optional() @IsString() @Matches(/^[A-Z0-9]{20}$/) root?: string;
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(['1', '2', '3'], { each: true })
  hierarchyLevel?: string[];
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  city?: string[];
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsArray()
  @ArrayMaxSize(20)
  @IsIn(
    [
      'ISSUED',
      'LAPSED',
      'RETIRED',
      'ANNULLED',
      'DUPLICATE',
      'MERGED',
      'PENDING_TRANSFER',
      'PENDING_ARCHIVAL',
      'PENDING_VALIDATION',
    ],
    { each: true },
  )
  registrationStatus?: string[];
  @Optional() @IsIn(['ACTIVE', 'INACTIVE']) entityStatus?: string;
  @Optional() @IsIn(['name', 'renewal', 'review-due']) sort?: string;
  @Optional() @IsString() @MaxLength(120) q?: string;
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(/^[A-Z]{2}$/, { each: true })
  country?: string[];
  @Optional() @IsString() @Matches(/^[A-Z0-9]{20}$/) group?: string;
  @Optional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? [value] : value)
  @IsArray()
  @ArrayMaxSize(10)
  @Matches(/^[A-Z0-9]{20}$/, { each: true })
  portfolio?: string[];
  @Optional()
  @IsIn(['all', 'review', 'lapsed', 'missing-parent'])
  quality?: string;
  @Optional() @IsIn(['all', 'ACTIVE', 'INACTIVE']) status?: string;
  @Optional()
  @IsIn(['all', 'overdue', 'due-30', 'due-90', 'unknown'])
  renewal?: string;
  @Optional()
  @IsIn([
    'all',
    'unassigned',
    'active',
    'open',
    'in_progress',
    'reviewed',
    'stale',
    'overdue',
  ])
  workflow?: string;
}

import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
export class UpdateReviewDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) evidenceVersion: string;
  @IsInt() @Min(0) version: number;
  @IsIn(['open', 'in_progress', 'reviewed']) status:
    | 'open'
    | 'in_progress'
    | 'reviewed';
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  owner: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  note: string;
}

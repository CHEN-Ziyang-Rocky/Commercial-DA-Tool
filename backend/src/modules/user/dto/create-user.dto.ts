import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsByteLength,
  IsIn,
  ValidateIf,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
export class CreateUserDto {
  @IsString() @Length(2, 120) fullName: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(120)
  email: string;
  @IsString() @Length(8, 50) @IsByteLength(8, 72) password: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  phone?: string;
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['user', 'admin'])
  role?: 'user' | 'admin';
}

// src/modules/user/dto/create-user.dto.ts
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(2, 120)
  fullName: string;

  @IsEmail()
  @Length(5, 120)
  email: string;

  @IsOptional()
  @IsString()
  @Length(5, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(3, 30)
  role?: string;
}

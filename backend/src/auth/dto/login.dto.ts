// src/auth/dto/login.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail() 
  @Length(5, 120) 
  email: string;

  @IsString()
  password: string;
}
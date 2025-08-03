// src/auth/dto/register.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString() 
  @Length(2, 120) 
  name: string;
  
  @IsEmail()  
  @Length(5, 120) 
  email: string;

  @IsString() 
  @Length(4, 50)  
  password: string;
}
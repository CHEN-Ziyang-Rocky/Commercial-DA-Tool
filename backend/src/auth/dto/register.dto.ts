import { PickType } from '@nestjs/mapped-types';
import { IsString, Length } from 'class-validator';
import { CreateUserDto } from '../../modules/user/dto/create-user.dto';
export class RegisterDto extends PickType(CreateUserDto, [
  'email',
  'password',
] as const) {
  @IsString() @Length(2, 120) name: string;
}

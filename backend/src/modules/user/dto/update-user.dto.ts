// src/modules/user/dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * PartialType 会把所有字段标记为可选
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}

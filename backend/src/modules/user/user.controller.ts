// src/modules/user/user.controller.ts
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
  } from '@nestjs/common';
  import { UserService } from './user.service';
  import { CreateUserDto } from './dto/create-user.dto';
  import { UpdateUserDto } from './dto/update-user.dto';
  
  @Controller('user')
  export class UserController {
    constructor(private readonly service: UserService) {}
  
    /** POST /user */
    @Post()
    create(@Body() dto: CreateUserDto) {
      return this.service.create(dto);
    }
  
    /** GET /user */
    @Get()
    findAll() {
      return this.service.findAll();
    }
  
    /** GET /user/:id */
    @Get(':id')
    findOne(@Param('id') id: string) {
      return this.service.findOne(id);
    }
  
    /** PATCH /user/:id */
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
      return this.service.update(id, dto);
    }
  
    /** DELETE /user/:id */
    @Delete(':id')
    remove(@Param('id') id: string) {
      return this.service.remove(id);
    }
  }
  
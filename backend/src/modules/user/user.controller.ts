import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { PaginationDto } from '../../common/pagination.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
@Controller('user')
@UseGuards(AdminGuard)
export class UserController {
  constructor(private readonly service: UserService) {}
  @Post() create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }
  @Get() findAll(@Query() query: PaginationDto) {
    return this.service.findAll(query.page, query.limit);
  }
  @Get(':id') findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
  @Patch(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: { user: { sub: string } },
  ) {
    if (id === req.user.sub && dto.role && dto.role !== 'admin')
      throw new ForbiddenException('Cannot demote your own account');
    return this.service.update(id, dto);
  }
  @Delete(':id') remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { sub: string } },
  ) {
    if (id === req.user.sub)
      throw new ForbiddenException('Cannot delete your own account');
    return this.service.remove(id);
  }
}

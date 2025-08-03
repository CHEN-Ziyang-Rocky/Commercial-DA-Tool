// src/modules/company/company.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompanyService } from './company.service';
import { SearchCompanyDto } from './dto/search-company.dto';
import { Public } from '../../auth/public.decorator';  // 若没有 auth，可删掉 @Public()

@Controller('company')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  /* ⇩ 便于测试缓存命中，公开 GET 接口 */
  @Public()
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Public()
  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.service.findCompany(code);
  }

  /* 原有搜索 */
  @Post('search')
  search(@Body() dto: SearchCompanyDto) {
    return this.service.search(dto);
  }
}

import { AggregateService } from './aggregate.service';
import { QueryCache } from './query-cache';
import { AdminGuard } from '../../auth/admin.guard';
import { UpdateReviewDto } from './review.dto';
import {
  Controller,
  Get,
  Param,
  Query,
  Header,
  Put,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RegistryService } from './registry.service';
import { RegistryQueryDto } from './registry-query.dto';
@Controller('registry')
export class RegistryController {
  constructor(
    private readonly service: RegistryService,
    private readonly aggregates: AggregateService,
    private readonly cache: QueryCache,
  ) {}
  @Get() list(@Query() query: RegistryQueryDto) {
    return this.service.list(query);
  }
  @Get('company-options') companyOptions() {
    return this.service.companyOptions();
  }
  @Get('aggregate') aggregate(@Query() query: RegistryQueryDto) {
    return this.aggregates.aggregate(query);
  }
  @Get('cache-status') @UseGuards(AdminGuard) cacheStatus() {
    return this.cache.status();
  }
  @Get('changes')
  changes() {
    return this.service.changes();
  }
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="entity-review.csv"')
  export(@Query() query: RegistryQueryDto) {
    return this.service.export(query);
  }
  @Put(':lei/review')
  @UseGuards(AdminGuard)
  updateReview(
    @Param('lei') lei: string,
    @Body() dto: UpdateReviewDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.updateReview(lei, dto, req.user.sub);
  }
  @Get(':lei') detail(@Param('lei') lei: string) {
    return this.service.detail(lei);
  }
}

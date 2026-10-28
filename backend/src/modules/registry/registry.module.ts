import { AggregateService } from './aggregate.service';
import { QueryCache } from './query-cache';
import { Module } from '@nestjs/common';
import { RegistryController } from './registry.controller';
import { RegistryService } from './registry.service';
@Module({
  controllers: [RegistryController],
  providers: [RegistryService, AggregateService, QueryCache],
})
export class RegistryModule {}

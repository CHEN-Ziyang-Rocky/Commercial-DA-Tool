import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DemoController, DemoBoundary } from './demo.controller';
import { DemoStore } from './demo-store';
import { RegistryService } from '../modules/registry/registry.service';
// Demo readers always receive an explicit public snapshot and never call the normal database.
@Module({ controllers: [DemoController], providers: [DemoStore, DemoBoundary, { provide: RegistryService, useFactory: () => new RegistryService({} as DataSource) }] })
export class DemoModule {}

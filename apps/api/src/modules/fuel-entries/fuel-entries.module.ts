import { Module } from '@nestjs/common';
import { FuelEntriesController } from './fuel-entries.controller';
import { FuelEntriesService } from './fuel-entries.service';

@Module({
  controllers: [FuelEntriesController],
  providers: [FuelEntriesService],
})
export class FuelEntriesModule {}

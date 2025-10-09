import { Module } from '@nestjs/common';

import { PermitsModule } from '../permits/permits.module';

import { ListingWriterController } from './listing-writer.controller';
import { ListingWriterService } from './listing-writer.service';

@Module({
  imports: [PermitsModule],
  controllers: [ListingWriterController],
  providers: [ListingWriterService]
})
export class ListingWriterModule {}

import { Module } from '@nestjs/common';

import { ListingWriterController } from './listing-writer.controller';
import { ListingWriterService } from './listing-writer.service';
import { PermitsModule } from '../permits/permits.module';

@Module({
  imports: [PermitsModule],
  controllers: [ListingWriterController],
  providers: [ListingWriterService]
})
export class ListingWriterModule {}

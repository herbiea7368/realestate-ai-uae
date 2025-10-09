import { Body, Controller, Post } from '@nestjs/common';

import { ListingWriterRequestDto } from './dto/listing-writer-request.dto';
import { ListingWriterService } from './listing-writer.service';

@Controller({ path: 'listing-writer', version: '1' })
export class ListingWriterController {
  constructor(private readonly listingWriterService: ListingWriterService) {}

  @Post()
  createDraft(@Body() payload: ListingWriterRequestDto) {
    return this.listingWriterService.draft(payload);
  }
}

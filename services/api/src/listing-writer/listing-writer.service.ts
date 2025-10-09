import { Injectable } from '@nestjs/common';

import { PermitsService } from '../permits/permits.service';
import {
  ListingLanguage,
  ListingWriterRequestDto
} from './dto/listing-writer-request.dto';

@Injectable()
export class ListingWriterService {
  constructor(private readonly permitsService: PermitsService) {}

  async draft(payload: ListingWriterRequestDto) {
    const permit = await this.permitsService.status(payload.trakheesiNumber);
    const isValid = permit.status === 'valid';

    const description =
      payload.language === ListingLanguage.Ar
        ? مسودة وصف للعقار .trim()
        : Draft listing copy for ;

    return {
      description,
      language: payload.language,
      permit,
      canPublish: isValid
    };
  }
}

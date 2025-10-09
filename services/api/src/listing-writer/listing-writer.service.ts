import { ConflictException, Injectable } from '@nestjs/common';

import { Market } from '../permits/dto/permit-check.dto';
import { PermitsService } from '../permits/permits.service';

import {
  ListingLanguage,
  ListingWriterRequestDto
} from './dto/listing-writer-request.dto';

@Injectable()
export class ListingWriterService {
  constructor(private readonly permitsService: PermitsService) {}

  async draft(payload: ListingWriterRequestDto) {
    const permit = await this.permitsService.check({
      propertyId: payload.propertyId,
      market: payload.market as Market,
      trakheesiNumber: payload.trakheesiNumber
    });

    if (permit.status !== 'valid') {
      throw new ConflictException({
        message: 'Permit validation failed',
        status: permit.status,
        errors: permit.errors
      });
    }

    const description = this.buildDescription(payload);

    return {
      description,
      language: payload.language,
      permit,
      toxicity_flag: false,
      generated_at: new Date().toISOString(),
      compliance: {
        canPublish: true,
        trakheesi_number: permit.trakheesiNumber,
        cache_hit: permit.cacheHit,
        errors: permit.errors
      }
    };
  }

  private buildDescription(payload: ListingWriterRequestDto) {
    const community = payload.community ?? 'Dubai';
    const permitTag = `Trakheesi ${payload.trakheesiNumber}`;

    if (payload.language === ListingLanguage.Ar) {
      return `\u0645\u0633\u0648\u062f\u0629 \u0648\u0635\u0641 (${permitTag}) \u0641\u064a ${community}. \u0633\u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0646\u0635 \u0628\u0639\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0627\u0645\u062a\u062b\u0627\u0644.`;
    }

    return `Draft listing (${permitTag}) in ${community}. Final AI copy pending compliance review.`;
  }
}

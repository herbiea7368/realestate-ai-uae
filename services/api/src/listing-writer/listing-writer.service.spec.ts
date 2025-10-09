import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PermitsService } from '../permits/permits.service';

import {
  ListingLanguage,
  ListingWriterRequestDto
} from './dto/listing-writer-request.dto';
import { ListingWriterService } from './listing-writer.service';

const basePayload: ListingWriterRequestDto = {
  propertyId: 'P-100',
  market: 'Dubai',
  trakheesiNumber: '654321',
  language: ListingLanguage.En
};

describe('ListingWriterService', () => {
  let service: ListingWriterService;
  let permits: PermitsService;

  beforeEach(() => {
    permits = {
      check: vi.fn().mockResolvedValue({
        trakheesiNumber: '654321',
        status: 'valid',
        issuer: 'DLD',
        errors: [],
        expiryDate: '2025-12-31',
        checkedAt: new Date().toISOString(),
        cacheHit: false
      })
    } as unknown as PermitsService;
    service = new ListingWriterService(permits);
  });

  it('injects trakheesi number into description and returns compliance data', async () => {
    const response = await service.draft(basePayload);

    expect(response.description).toContain('Trakheesi 654321');
    expect(response.toxicity_flag).toBe(false);
    expect(response.compliance.canPublish).toBe(true);
    expect(response.compliance.trakheesi_number).toBe('654321');
  });

  it('throws when permit is not valid', async () => {
    (permits.check as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      trakheesiNumber: '123456',
      status: 'expired',
      issuer: 'DLD',
      errors: ['permit_expired'],
      checkedAt: new Date().toISOString(),
      cacheHit: false
    });

    await expect(service.draft(basePayload)).rejects.toBeInstanceOf(
      ConflictException
    );
  });
});

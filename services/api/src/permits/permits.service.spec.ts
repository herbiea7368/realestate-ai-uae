import { beforeEach, describe, expect, it } from 'vitest';

import { Market, PermitCheckDto } from './dto/permit-check.dto';
import { PermitsService } from './permits.service';

const makeDto = (overrides?: Partial<PermitCheckDto>): PermitCheckDto => ({
  propertyId: 'P-100',
  market: Market.Dubai,
  trakheesiNumber: '654321',
  ...overrides
});

describe('PermitsService', () => {
  let service: PermitsService;

  beforeEach(() => {
    service = new PermitsService();
  });

  it('TC-001: returns valid status for known permit', async () => {
    const result = await service.check(makeDto());

    expect(result.status).toBe('valid');
    expect(result.errors).toEqual([]);
    expect(result.cacheHit).toBe(false);

    const cached = await service.status('654321');
    expect(cached.cacheHit).toBe(true);
  });

  it('TC-002: marks expired permit and reports error', async () => {
    const result = await service.check(
      makeDto({ trakheesiNumber: '123456' })
    );

    expect(result.status).toBe('expired');
    expect(result.errors).toContain('permit_expired');
  });
});

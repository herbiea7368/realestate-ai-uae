import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditLoggerService } from '../shared/audit-logger.service';

import { PermitService } from './permit.service';

class AuditLoggerStub extends AuditLoggerService {
  constructor() {
    // @ts-expect-error - ignore parent constructor side effects
    super();
  }

  override log = vi.fn().mockResolvedValue(undefined);
}

describe('PermitService', () => {
  let service: PermitService;

  beforeEach(() => {
    service = new PermitService(new AuditLoggerStub());
  });

  it('marks a valid permit as valid', async () => {
    const result = await service.checkPermit({
      property_id: 'P-100',
      market: 'Dubai',
      trakheesi_number: '654321',
    });

    expect(result.status).toBe('valid');
    expect(result.errors).toEqual([]);
  });

  it('marks missing permit as not_found', async () => {
    const result = await service.checkPermit({
      property_id: 'P-999',
      market: 'Dubai',
      trakheesi_number: '000000',
    });

    expect(result.status).toBe('not_found');
    expect(result.errors).toContain('permit_not_found');
  });

  it('marks suspended permit with reason', async () => {
    const result = await service.checkPermit({
      property_id: 'P-777',
      market: 'Dubai',
      trakheesi_number: '777777',
    });

    expect(result.status).toBe('suspended');
    expect(result.errors).toContain('broker_license_revoked');
  });
});

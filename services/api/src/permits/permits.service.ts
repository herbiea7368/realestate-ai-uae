import { BadRequestException, Injectable } from '@nestjs/common';

import { Market, PermitCheckDto } from './dto/permit-check.dto';

type PermitStatus = 'valid' | 'expired' | 'not_found' | 'suspended';

interface PermitRegistryRecord {
  trakheesiNumber: string;
  issuer: 'DLD';
  expiryDate: string;
  status: PermitStatus;
  suspendedReason?: string;
}

export interface PermitValidationResult {
  trakheesiNumber: string;
  status: PermitStatus;
  issuer: 'DLD';
  expiryDate?: string;
  errors: string[];
  checkedAt: string;
  cacheHit: boolean;
}

interface CachedPermit {
  payload: PermitValidationResult;
  expiresAt: number;
}

const STUB_REGISTRY: Record<string, PermitRegistryRecord> = {
  '654321': {
    trakheesiNumber: '654321',
    issuer: 'DLD',
    expiryDate: '2025-12-31',
    status: 'valid'
  },
  '123456': {
    trakheesiNumber: '123456',
    issuer: 'DLD',
    expiryDate: '2024-01-31',
    status: 'expired'
  },
  '777777': {
    trakheesiNumber: '777777',
    issuer: 'DLD',
    expiryDate: '2025-03-19',
    status: 'suspended',
    suspendedReason: 'broker_license_revoked'
  }
};

@Injectable()
export class PermitsService {
  private readonly cache = new Map<string, CachedPermit>();
  private readonly ttlMs = Number(process.env.PERMIT_CACHE_TTL_MS ?? 5 * 60_000);

  async check(dto: PermitCheckDto): Promise<PermitValidationResult> {
    if (dto.market !== Market.Dubai) {
      throw new BadRequestException('Market not supported');
    }
    return this.resolve(dto.trakheesiNumber);
  }

  async status(trakheesi: string): Promise<PermitValidationResult> {
    return this.resolve(trakheesi);
  }

  private async resolve(trakheesi: string): Promise<PermitValidationResult> {
    const cached = this.cache.get(trakheesi);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return { ...cached.payload, cacheHit: true };
    }

    const record = await this.fetchFromRegistry(trakheesi);
    const evaluated = this.evaluateRecord(record, trakheesi);
    this.cache.set(trakheesi, {
      payload: evaluated,
      expiresAt: now + this.ttlMs
    });

    return { ...evaluated, cacheHit: false };
  }

  private async fetchFromRegistry(
    trakheesi: string
  ): Promise<PermitRegistryRecord | null> {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return STUB_REGISTRY[trakheesi] ?? null;
  }

  private evaluateRecord(
    record: PermitRegistryRecord | null,
    trakheesi: string
  ): PermitValidationResult {
    const now = new Date();
    const errors: string[] = [];
    let status: PermitStatus = 'not_found';
    let expiryDate: string | undefined;

    if (!record) {
      errors.push('permit_not_found');
    } else {
      expiryDate = record.expiryDate;
      const expiry = new Date(record.expiryDate);
      if (record.status === 'suspended') {
        status = 'suspended';
        errors.push(record.suspendedReason ?? 'permit_suspended');
      } else if (expiry.getTime() < now.getTime()) {
        status = 'expired';
        errors.push('permit_expired');
      } else {
        status = 'valid';
      }
    }

    return {
      trakheesiNumber: trakheesi,
      status,
      issuer: 'DLD',
      expiryDate,
      errors,
      checkedAt: now.toISOString(),
      cacheHit: false
    };
  }
}

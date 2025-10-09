import { Injectable } from '@nestjs/common';

import { PermitCheckDto } from './dto/permit-check.dto';

export interface PermitRecord {
  trakheesiNumber: string;
  status: 'valid' | 'expired' | 'not_found' | 'suspended';
  expiryDate?: string;
  issuer: 'DLD';
}

@Injectable()
export class PermitsService {
  private readonly data: Record<string, PermitRecord> = {
    '654321': {
      trakheesiNumber: '654321',
      status: 'valid',
      expiryDate: '2025-12-31',
      issuer: 'DLD'
    }
  };

  async check(dto: PermitCheckDto) {
    const record = this.data[dto.trakheesiNumber];
    return (
      record ?? {
        trakheesiNumber: dto.trakheesiNumber,
        status: 'not_found',
        issuer: 'DLD'
      }
    );
  }

  async status(trakheesi: string) {
    return (
      this.data[trakheesi] ?? {
        trakheesiNumber: trakheesi,
        status: 'not_found',
        issuer: 'DLD'
      }
    );
  }
}

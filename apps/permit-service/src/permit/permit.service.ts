import { Injectable } from '@nestjs/common';

import { AuditLoggerService } from '../shared/audit-logger.service';

import { PermitCheckDto } from './dto/permit-check.dto';
import { PermitRecord, PermitValidationResult } from './permit.types';

@Injectable()
export class PermitService {
  private readonly permits: Map<string, PermitRecord>;

  constructor(private readonly auditLogger: AuditLoggerService) {
    this.permits = new Map(
      [
        {
          trakheesiNumber: '654321',
          issuer: 'DLD' as const,
          issueDate: '2024-01-15',
          expiryDate: '2025-12-31',
          status: 'valid',
        },
        {
          trakheesiNumber: '123456',
          issuer: 'DLD' as const,
          issueDate: '2023-01-01',
          expiryDate: '2024-06-30',
          status: 'expired',
        },
        {
          trakheesiNumber: '777777',
          issuer: 'DLD' as const,
          issueDate: '2024-03-20',
          expiryDate: '2025-03-19',
          status: 'suspended',
          suspendedReason: 'broker_license_revoked',
        },
      ].map((permit) => [permit.trakheesiNumber, permit]),
    );
  }

  async checkPermit(
    payload: PermitCheckDto,
  ): Promise<PermitValidationResult> {
    const result = this.evaluatePermit(payload.trakheesi_number);
    await this.auditLogger.log('permits', 'permit.check', 'Permit evaluated', {
      ...payload,
      status: result.status,
      errors: result.errors,
    });
    return result;
  }

  async getStatus(trakheesi: string): Promise<PermitValidationResult> {
    const result = this.evaluatePermit(trakheesi);
    await this.auditLogger.log('permits', 'permit.status', 'Permit status read', {
      trakheesi,
      status: result.status,
    });
    return result;
  }

  private evaluatePermit(trakheesi: string): PermitValidationResult {
    const record = this.permits.get(trakheesi);
    const now = new Date();
    const errors: string[] = [];
    let status: PermitRecord['status'] | 'not_found' = 'not_found';
    let expiryDate: string | undefined;

    if (!record) {
      errors.push('permit_not_found');
    } else {
      expiryDate = record.expiryDate;
      if (record.status === 'suspended') {
        status = 'suspended';
        errors.push(record.suspendedReason ?? 'permit_suspended');
      } else if (new Date(record.expiryDate) < now) {
        status = 'expired';
        errors.push('permit_expired');
      } else {
        status = 'valid';
      }
    }

    return {
      status,
      issuer: 'DLD',
      expiryDate,
      errors,
      checkedAt: now.toISOString(),
    };
  }
}

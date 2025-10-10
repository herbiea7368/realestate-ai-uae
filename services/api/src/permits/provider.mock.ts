import { PermitRecord } from '../types';
import { PermitProvider } from './provider.interface';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function compute(trakheesi: string): PermitRecord {
  const normalized = trakheesi.trim();
  if (!/^\d{8}$/.test(normalized)) {
    return { status: 'invalid', expiresAt: 0 };
  }

  if (normalized.endsWith('0')) {
    return { status: 'invalid', expiresAt: 0 };
  }

  return {
    status: 'valid',
    expiresAt: Date.now() + SEVEN_DAYS_MS
  };
}

export const mockProvider: PermitProvider = {
  async verify(trakheesi: string): Promise<PermitRecord> {
    return compute(trakheesi);
  }
};

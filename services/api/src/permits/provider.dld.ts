import { PermitRecord } from '../types';
import { PermitProvider } from './provider.interface';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function fallbackCompute(trakheesi: string): PermitRecord {
  const normalized = trakheesi.trim();
  if (!/^\d{8}$/.test(normalized) || normalized.endsWith('0')) {
    return { status: 'invalid', expiresAt: 0 };
  }

  return {
    status: 'valid',
    expiresAt: Date.now() + SEVEN_DAYS_MS
  };
}

export const dldProvider: PermitProvider = {
  async verify(trakheesi: string): Promise<PermitRecord> {
    const baseUrl = process.env.TRAKHEESI_API_BASE ?? '';
    const apiKey = process.env.TRAKHEESI_API_KEY ?? '';

    if (!baseUrl || !apiKey) {
      return fallbackCompute(trakheesi);
    }

    // TODO: replace mock response with live integration once API contract is finalised.
    return fallbackCompute(trakheesi);
  }
};

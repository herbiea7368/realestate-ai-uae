import { PermitRecord } from '../types';

const permitCache = new Map<string, PermitRecord>();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function computePermit(trakheesi: string): PermitRecord {
  const normalized = trakheesi.trim();
  const isEightDigits = /^\d{8}$/.test(normalized);
  if (!isEightDigits) {
    return { status: 'invalid', expiresAt: 0 };
  }
  if (normalized.endsWith('0')) {
    return { status: 'invalid', expiresAt: 0 };
  }
  const expiresAt = Date.now() + SEVEN_DAYS_MS;
  return { status: 'valid', expiresAt };
}

export function checkPermit(trakheesi: string): PermitRecord {
  const record = computePermit(trakheesi);
  permitCache.set(trakheesi, record);
  return record;
}

export function getPermit(trakheesi: string): PermitRecord {
  const cached = permitCache.get(trakheesi);
  if (cached) {
    if (cached.status === 'valid' && cached.expiresAt <= Date.now()) {
      const expired: PermitRecord = { status: 'expired', expiresAt: cached.expiresAt };
      permitCache.set(trakheesi, expired);
      return expired;
    }
    return cached;
  }
  const computed = computePermit(trakheesi);
  permitCache.set(trakheesi, computed);
  if (computed.status === 'valid' && computed.expiresAt <= Date.now()) {
    const expired: PermitRecord = { status: 'expired', expiresAt: computed.expiresAt };
    permitCache.set(trakheesi, expired);
    return expired;
  }
  return computed;
}

export function clearPermitCache(): void {
  permitCache.clear();
}

export function seedPermit(trakheesi: string, record: PermitRecord): void {
  permitCache.set(trakheesi, record);
}

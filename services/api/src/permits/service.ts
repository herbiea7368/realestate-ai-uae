import { getProvider } from './provider.factory';
import type { PermitRecord } from '../types';
import * as cache from '../cache';

const CACHE_PREFIX = 'permits:trakheesi:';
const TTL_SECONDS = 7 * 24 * 60 * 60;

export interface PermitResult extends PermitRecord {
  source: 'cache' | 'provider';
}

const provider = getProvider();

function normalize(trakheesi: string): string {
  return trakheesi.trim();
}

function cacheKey(trakheesi: string): string {
  return `${CACHE_PREFIX}${trakheesi}`;
}

function applyExpiry(record: PermitRecord): PermitRecord {
  if (record.status === 'valid' && record.expiresAt <= Date.now()) {
    return {
      status: 'expired',
      expiresAt: record.expiresAt
    };
  }
  return record;
}

export async function checkPermit(trakheesi: string): Promise<PermitResult> {
  const normalized = normalize(trakheesi);
  const verified = await provider.verify(normalized);
  const record = applyExpiry(verified);
  await cache.set(cacheKey(normalized), record, TTL_SECONDS);
  return { ...record, source: 'provider' };
}

export async function getPermit(trakheesi: string): Promise<PermitResult> {
  const normalized = normalize(trakheesi);
  const key = cacheKey(normalized);
  const cached = await cache.get<PermitRecord>(key);

  if (cached) {
    const record = applyExpiry(cached);
    if (record !== cached) {
      await cache.set(key, record, TTL_SECONDS);
    }
    return { ...record, source: 'cache' };
  }

  return checkPermit(normalized);
}

export async function clearPermitCache(): Promise<void> {
  await cache.flush(CACHE_PREFIX);
}

export async function seedPermit(trakheesi: string, record: PermitRecord): Promise<void> {
  const normalized = normalize(trakheesi);
  await cache.set(cacheKey(normalized), record, TTL_SECONDS);
}

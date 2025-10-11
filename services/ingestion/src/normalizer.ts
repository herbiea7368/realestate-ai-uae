import type { NormalisedListing, RawFeedItem } from './types';

type CandidateList = string[];

const TITLE_KEYS: CandidateList = ['title', 'name', 'headline'];
const DESCRIPTION_KEYS: CandidateList = ['description', 'summary', 'details'];
const PRICE_KEYS: CandidateList = ['price_aed', 'price', 'priceaed', 'price_aed_value', 'price_aed_amount'];
const BED_KEYS: CandidateList = ['bedrooms', 'beds', 'bed_count'];
const BATH_KEYS: CandidateList = ['bathrooms', 'baths', 'bath_count'];
const SQFT_KEYS: CandidateList = ['sqft', 'size_sqft', 'square_feet', 'area_sqft', 'area'];
const COMMUNITY_KEYS: CandidateList = ['community', 'neighbourhood', 'neighborhood', 'district'];
const PERMIT_KEYS: CandidateList = ['permit', 'trakheesi', 'trakheesi_number', 'permit_number', 'permitNo'];
const LAT_KEYS: CandidateList = ['lat', 'latitude', 'location.lat', 'location.latitude', 'coordinates.lat'];
const LON_KEYS: CandidateList = ['lon', 'lng', 'longitude', 'location.lon', 'location.lng', 'location.longitude', 'coordinates.lon', 'coordinates.lng'];

function accessValue(item: RawFeedItem, candidate: string): unknown {
  if (candidate.includes('.')) {
    const parts = candidate.split('.');
    let current: unknown = item;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }

      if (Array.isArray(current)) {
        current = current[0];
      }

      if (typeof current === 'object' && current !== null && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  if (candidate in item) {
    return item[candidate];
  }

  const lower = candidate.toLowerCase();
  for (const [key, value] of Object.entries(item)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }

  return undefined;
}

function toStringValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toStringValue(entry)).filter(Boolean).join(' ').trim();
  }

  return '';
}

function toNumberValue(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const numeric = toNumberValue(entry);
      if (numeric !== null) {
        return numeric;
      }
    }
  }

  return null;
}

function pickString(item: RawFeedItem, candidates: CandidateList): string {
  for (const candidate of candidates) {
    const value = accessValue(item, candidate);
    const serialised = toStringValue(value);
    if (serialised) {
      return serialised;
    }
  }
  return '';
}

function pickNumber(item: RawFeedItem, candidates: CandidateList): number | null {
  for (const candidate of candidates) {
    const value = accessValue(item, candidate);
    const numeric = toNumberValue(value);
    if (numeric !== null) {
      return numeric;
    }
  }
  return null;
}

function normaliseListing(item: RawFeedItem): NormalisedListing | null {
  const title = pickString(item, TITLE_KEYS);
  const permit = pickString(item, PERMIT_KEYS);
  const community = pickString(item, COMMUNITY_KEYS);
  const description = pickString(item, DESCRIPTION_KEYS);

  const price = pickNumber(item, PRICE_KEYS);
  const bedrooms = pickNumber(item, BED_KEYS);
  const bathrooms = pickNumber(item, BATH_KEYS);
  const sqft = pickNumber(item, SQFT_KEYS);
  const lat = pickNumber(item, LAT_KEYS);
  const lon = pickNumber(item, LON_KEYS);

  if (!title || !permit || !community) {
    return null;
  }

  if (
    price === null ||
    bedrooms === null ||
    bathrooms === null ||
    sqft === null ||
    lat === null ||
    lon === null
  ) {
    return null;
  }

  return {
    title,
    description: description || undefined,
    price_aed: price,
    bedrooms,
    bathrooms,
    sqft,
    community,
    permit,
    lat,
    lon
  };
}

export function normaliseListings(items: RawFeedItem[]): NormalisedListing[] {
  const seenPermits = new Set<string>();

  return items.reduce<NormalisedListing[]>((acc, item) => {
    const listing = normaliseListing(item);
    if (!listing) {
      return acc;
    }

    const permitKey = listing.permit.trim().toUpperCase();
    if (seenPermits.has(permitKey)) {
      return acc;
    }
    seenPermits.add(permitKey);

    acc.push(listing);
    return acc;
  }, []);
}

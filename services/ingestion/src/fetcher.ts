import fetch, { type RequestInit } from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import type { RawFeedItem } from './types';

export type FeedResult = {
  items: RawFeedItem[];
  format: 'json' | 'xml';
};

function stripBom(input: string): string {
  if (input.charCodeAt(0) === 0xfeff) {
    return input.slice(1);
  }
  return input;
}

function sanitiseRecord(input: unknown): RawFeedItem {
  if (!input || typeof input !== 'object') {
    return {};
  }

  return Object.entries(input as Record<string, unknown>).reduce<RawFeedItem>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    if (Array.isArray(value)) {
      if (value.length === 1) {
        const [single] = value;
        acc[key] =
          single && typeof single === 'object' ? sanitiseRecord(single) : (single as unknown);
      } else {
        acc[key] = value.map((item) => (typeof item === 'object' ? sanitiseRecord(item) : item));
      }
      return acc;
    }

    if (typeof value === 'object') {
      acc[key] = sanitiseRecord(value);
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
}

function extractRecords(value: unknown, depth = 0): RawFeedItem[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractRecords(item, depth + 1));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const listingKey = keys.find((key) => /listing|item/i.test(key));
    if (listingKey) {
      return extractRecords(record[listingKey], depth + 1);
    }

    if (depth === 0 && keys.length === 1) {
      return extractRecords(record[keys[0]], depth + 1);
    }

    return [sanitiseRecord(record)];
  }

  return [];
}

function parseJsonFeed(payload: string): RawFeedItem[] {
  const cleaned = stripBom(payload).trim();
  if (!cleaned) {
    return [];
  }

  const parsed = JSON.parse(cleaned) as unknown;
  if (Array.isArray(parsed)) {
    return parsed.map((item) => sanitiseRecord(item));
  }

  if (parsed && typeof parsed === 'object') {
    const candidates = ['listings', 'items', 'data', 'results'];
    for (const key of candidates) {
      const value = (parsed as Record<string, unknown>)[key];
      if (value !== undefined) {
        return extractRecords(value);
      }
    }
    return [sanitiseRecord(parsed)];
  }

  return [];
}

async function parseXmlFeed(payload: string): Promise<RawFeedItem[]> {
  const cleaned = stripBom(payload).trim();
  if (!cleaned) {
    return [];
  }

  const parsed = await parseStringPromise(cleaned, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });

  return extractRecords(parsed);
}

export async function fetchFeed(sourceUrl: string, init?: RequestInit): Promise<FeedResult> {
  if (!sourceUrl) {
    throw new Error('Source URL is required for ingestion');
  }

  const response = await fetch(sourceUrl, {
    ...init,
    headers: {
      Accept: 'application/json, application/xml, text/xml',
      ...(init?.headers as Record<string, string> | undefined)
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed (${response.status} ${response.statusText})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = await response.text();
  const looksJson =
    contentType.includes('json') ||
    payload.trim().startsWith('{') ||
    payload.trim().startsWith('[');

  if (looksJson) {
    return {
      items: parseJsonFeed(payload),
      format: 'json'
    };
  }

  return {
    items: await parseXmlFeed(payload),
    format: 'xml'
  };
}

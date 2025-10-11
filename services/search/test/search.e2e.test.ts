import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import request from 'supertest';

vi.mock('../src/db.js', () => {
  return {
    runQuery: vi.fn()
  };
});

type Listing = {
  id: string;
  title: string;
  description: string;
  price_aed: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  community: string;
};

const consentMock = vi.fn();
const { default: app } = await import('../src/index.js');
const { runQuery } = (await import('../src/db.js')) as { runQuery: unknown };
const runQueryMock = runQuery as Mock<
  [string, unknown[]?],
  Promise<{ rows: Listing[] | { count: string }[] }>
>;

describe('search service', () => {
  const listings: Listing[] = [
    {
      id: '1',
      title: 'Downtown duplex',
      description: 'Spacious unit',
      price_aed: 2500000,
      bedrooms: 2,
      bathrooms: 3,
      sqft: 1600,
      community: 'Downtown Dubai'
    },
    {
      id: '2',
      title: 'Marina 1BR',
      description: 'Great view',
      price_aed: 1600000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 820,
      community: 'Dubai Marina'
    }
  ];

  beforeAll(() => {
    process.env.ENFORCE_CONSENT = 'true';
    global.fetch = consentMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ consent: true })
    }) as unknown as typeof fetch;
  });

  beforeEach(() => {
    consentMock.mockClear();
    runQueryMock.mockReset();
    runQueryMock.mockImplementation((sql: string, params: unknown[] = []) => {
      if (sql.startsWith('select count(*)')) {
        const filtered = filterListings(sql, params);
        return Promise.resolve({ rows: [{ count: String(filtered.length) }] });
      }

      if (sql.trim().startsWith('select id, title')) {
        const filtered = filterListings(sql, params);
        return Promise.resolve({ rows: filtered });
      }

      if (sql.includes('group by community')) {
        return Promise.resolve({
          rows: [
            { community: 'Downtown Dubai', count: '1' },
            { community: 'Dubai Marina', count: '1' }
          ]
        });
      }

      if (sql.includes('group by bedrooms')) {
        return Promise.resolve({
          rows: [
            { bedrooms: 1, count: '1' },
            { bedrooms: 2, count: '1' }
          ]
        });
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    });
  });

  it('returns health payload', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('returns paginated search results', async () => {
    const response = await request(app)
      .get('/search')
      .set('x-user-id', 'user-1')
      .query({ pageSize: 10 });

    expect(consentMock).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.total).toBe(2);
  });

  it('applies bedroom filter', async () => {
    const response = await request(app)
      .get('/search')
      .set('x-user-id', 'user-2')
      .query({ beds: 2 });

    expect(response.status).toBe(200);
    expect(response.body.items.every((item: Listing) => item.bedrooms >= 2)).toBe(true);
    expect(response.body.total).toBe(1);
  });

  it('returns facets', async () => {
    const response = await request(app).get('/facets').set('x-user-id', 'user-3');
    expect(response.status).toBe(200);
    expect(response.body.community.some((bucket: any) => bucket.value === 'Downtown Dubai')).toBe(true);
    expect(response.body.community.some((bucket: any) => bucket.value === 'Dubai Marina')).toBe(true);
  });

  function filterListings(sql: string, params: unknown[]): Listing[] {
    let filtered = [...listings];
    let index = 0;

    if (sql.includes('websearch_to_tsquery')) {
      const term = String(params[index++] ?? '').toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term)
      );
    }

    if (sql.includes('price_aed >= ')) {
      const value = Number(params[index++] ?? 0);
      filtered = filtered.filter((item) => item.price_aed >= value);
    }

    if (sql.includes('price_aed <= ')) {
      const value = Number(params[index++] ?? 0);
      filtered = filtered.filter((item) => item.price_aed <= value);
    }

    if (sql.includes('bedrooms >= ')) {
      const value = Number(params[index++] ?? 0);
      filtered = filtered.filter((item) => item.bedrooms >= value);
    }

    if (sql.includes('bathrooms >= ')) {
      index += 1;
    }

    if (sql.includes('community = ')) {
      const value = String(params[index++] ?? '');
      filtered = filtered.filter((item) => item.community === value);
    }

    return filtered;
  }
});

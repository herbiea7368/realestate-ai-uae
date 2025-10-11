import { newDb } from 'pg-mem';
import type { FeedResult } from '../src/fetcher';
import { runIngestion } from '../src/index';
import { resetPermitMemo } from '../src/writer';
import { register, resetMetrics } from '../src/metrics';

describe('ingestion pipeline', () => {
  beforeEach(() => {
    resetPermitMemo();
    resetMetrics();
  });

  it('ingests and upserts listings into the search database', async () => {
    const database = newDb();

    database.public.registerFunction({
      name: 'st_makepoint',
      args: ['double precision', 'double precision'],
      returns: 'text',
      implementation: (lon: number, lat: number) => `POINT(${lon} ${lat})`
    } as any);

    database.public.registerFunction({
      name: 'st_setsrid',
      args: ['text', 'integer'],
      returns: 'text',
      implementation: (point: string, srid: number) => `${point};SRID=${srid}`
    } as any);

    database.public.none(`
      create table listings (
        id serial primary key,
        title text not null,
        description text,
        price_aed numeric not null,
        bedrooms int not null,
        bathrooms int not null,
        sqft numeric not null,
        community text not null,
        location text not null,
        created_at timestamptz not null default now(),
        permit varchar(16) unique
      );
    `);

    const { Pool } = database.adapters.createPg();
    const pool = new Pool();

    const baseFeed: FeedResult = {
      format: 'json',
      items: [
        {
          title: 'Skyline View Apartment',
          description: 'High floor with Burj Khalifa view',
          price_aed: '950000',
          bedrooms: '2',
          bathrooms: '2',
          sqft: '1185',
          community: 'Downtown Dubai',
          trakheesi_number: 'TR-12345',
          latitude: '25.2048',
          longitude: '55.2708'
        }
      ]
    };

    const summary = await runIngestion({
      sourceUrl: 'test://feed',
      fetchFeedFn: async () => baseFeed,
      writerOptions: {
        pool,
        verifyPermit: async () => Promise.resolve()
      }
    });

    expect(summary.total).toBe(1);
    expect(summary.normalised).toBe(1);
    expect(summary.inserted).toBe(1);
    expect(summary.updated).toBe(0);
    expect(summary.skipped).toBe(0);

    const storedFirst = await pool.query(
      `select permit, price_aed::numeric::int as price, community from listings`
    );

    expect(storedFirst.rowCount).toBe(1);
    expect(storedFirst.rows[0]).toMatchObject({
      permit: 'TR-12345',
      price: 950000,
      community: 'Downtown Dubai'
    });

    const updatedFeed: FeedResult = {
      format: 'json',
      items: [
        {
          ...baseFeed.items[0],
          price_aed: '975000'
        }
      ]
    };

    const secondRun = await runIngestion({
      sourceUrl: 'test://feed',
      fetchFeedFn: async () => updatedFeed,
      writerOptions: {
        pool,
        verifyPermit: async () => Promise.resolve()
      }
    });

    expect(secondRun.inserted).toBe(0);
    expect(secondRun.updated).toBe(1);

    const storedSecond = await pool.query(
      `select permit, price_aed::numeric::int as price from listings`
    );
    expect(storedSecond.rows[0]).toMatchObject({
      permit: 'TR-12345',
      price: 975000
    });

    await pool.end();

    const runsSnapshot = await register.getSingleMetricAsString('ingestion_runs_total');
    expect(runsSnapshot).toMatch(/result="success".*2/);

    const rowsSnapshot = await register.getSingleMetricAsString('ingestion_rows_written_total');
    expect(rowsSnapshot.trim().endsWith('2')).toBe(true);

    const gaugeSnapshot = await register.getSingleMetricAsString('ingestion_last_run_timestamp');
    const lastValue = Number(gaugeSnapshot.trim().split('\n').pop()?.split(' ').pop() ?? '0');
    expect(Number.isFinite(lastValue)).toBe(true);
    expect(lastValue).toBeGreaterThan(0);
  });
});

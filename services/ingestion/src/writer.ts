import fetch from 'node-fetch';
import { Pool, type PoolClient } from 'pg';
import type { NormalisedListing } from './types';

export type WriterOptions = {
  pool?: Pool;
  verifyPermit?: (permit: string) => Promise<void>;
};

export type WriteResult = {
  inserted: number;
  updated: number;
  skipped: number;
};

let sharedPool: Pool | null = null;
const permitMemo = new Map<string, boolean>();

function buildPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/realestate';

  return new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
}

function getPool(): Pool {
  if (!sharedPool) {
    sharedPool = buildPool();
  }
  return sharedPool;
}

function resolvePermitEndpoint(): string {
  const explicit = process.env.PERMITS_CHECK_URL ?? process.env.PERMITS_SERVICE_URL;
  if (explicit) {
    return explicit;
  }

  const base =
    process.env.API_BASE_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4001';

  return `${base.replace(/\/$/, '')}/permits/check`;
}

async function defaultVerifyPermit(permit: string): Promise<void> {
  const normalized = permit.trim();
  if (!normalized) {
    throw new Error('Missing permit number');
  }

  if (permitMemo.has(normalized)) {
    if (!permitMemo.get(normalized)) {
      throw new Error(`Permit ${normalized} not approved`);
    }
    return;
  }

  const endpoint = resolvePermitEndpoint();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ trakheesi_number: normalized })
  });

  if (!response.ok) {
    throw new Error(`Permit verification failed with status ${response.status}`);
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Permit verification response was not JSON: ${(error as Error).message}`);
  }

  const status = typeof payload.status === 'string' ? payload.status : '';
  const expiresAt =
    typeof payload.expiresAt === 'number'
      ? new Date(payload.expiresAt).toISOString()
      : payload.expiresAt;

  console.info('[ingestion.permit]', {
    permit: normalized,
    status,
    expiresAt
  });

  const approved = status === 'valid';
  permitMemo.set(normalized, approved);

  if (!approved) {
    throw new Error(`Permit ${normalized} is not valid (status: ${status || 'unknown'})`);
  }
}

async function beginTransaction(client: PoolClient): Promise<void> {
  await client.query('begin');
}

async function rollbackTransaction(client: PoolClient): Promise<void> {
  await client.query('rollback');
}

async function commitTransaction(client: PoolClient): Promise<void> {
  await client.query('commit');
}

export async function writeListings(
  listings: NormalisedListing[],
  options: WriterOptions = {}
): Promise<WriteResult> {
  if (!listings.length) {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  const pool = options.pool ?? getPool();
  const verifyPermit = options.verifyPermit ?? defaultVerifyPermit;

  const client = await pool.connect();
  const counters: WriteResult = { inserted: 0, updated: 0, skipped: 0 };

  try {
    await beginTransaction(client);

    for (const listing of listings) {
      try {
        await verifyPermit(listing.permit);
      } catch (error) {
        counters.skipped += 1;
        console.warn('[ingestion.permit.invalid]', {
          permit: listing.permit,
          reason: error instanceof Error ? error.message : String(error)
        });
        continue;
      }

      const params: unknown[] = [
        listing.permit,
        listing.title,
        listing.description ?? null,
        listing.price_aed,
        listing.bedrooms,
        listing.bathrooms,
        listing.sqft,
        listing.community,
        listing.lon,
        listing.lat
      ];

      const updated = await client.query(
        `update listings
         set title = $2,
             description = $3,
             price_aed = $4,
             bedrooms = $5,
             bathrooms = $6,
             sqft = $7,
             community = $8,
             location = ST_SetSRID(ST_MakePoint($9, $10), 4326)
         where permit = $1`,
        params
      );

      if (updated.rowCount > 0) {
        counters.updated += 1;
        continue;
      }

      const inserted = await client.query(
        `insert into listings (permit, title, description, price_aed, bedrooms, bathrooms, sqft, community, location)
         values ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326))
         on conflict (permit) do nothing
         returning permit`,
        params
      );

      if (inserted.rowCount > 0) {
        counters.inserted += 1;
      } else {
        counters.skipped += 1;
      }
    }

    await commitTransaction(client);
  } catch (error) {
    await rollbackTransaction(client);
    throw error;
  } finally {
    client.release();
  }

  console.info('[ingestion.writer]', counters);
  return counters;
}

export async function closePool(): Promise<void> {
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = null;
  }
}

export function resetPermitMemo(): void {
  permitMemo.clear();
}

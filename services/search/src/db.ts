import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/realestate';

export const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

export async function runQuery<T extends QueryResultRow = QueryResultRow>(
  queryText: string | QueryConfig,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(queryText, params);
}

export async function useTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await handler(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { runQuery } from './db.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(CURRENT_DIR, 'sql');

async function readSqlFile(filename: string): Promise<string> {
  const filePath = resolve(ROOT_DIR, filename);
  return readFile(filePath, 'utf8');
}

export async function applySchema(): Promise<void> {
  const schemaSql = await readSqlFile('schema.sql');
  await runQuery(schemaSql);
}

export async function seedDatabase(): Promise<void> {
  const seedSql = await readSqlFile('seed.sql');
  if (!seedSql.trim()) {
    return;
  }
  await runQuery(seedSql);
}

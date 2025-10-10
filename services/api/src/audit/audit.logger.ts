import { promises as fs } from 'fs';
import { mkdirSync } from 'fs';
import path from 'path';

export interface AuditLogPayload {
  route: string;
  method: string;
  status: number;
  body?: unknown;
  result?: unknown;
  userId?: string | null;
}

export interface AuditLogRecord extends AuditLogPayload {
  ts: string;
}

const LOG_DIRECTORY = path.resolve(__dirname, '../..', 'logs');
const LOG_FILE_PATH = path.join(LOG_DIRECTORY, 'audit.log');

let directoryEnsured = false;

function ensureDirectory(): void {
  if (!directoryEnsured) {
    mkdirSync(LOG_DIRECTORY, { recursive: true });
    directoryEnsured = true;
  }
}

async function persistToDatabase(record: AuditLogRecord): Promise<void> {
  // TODO: integrate with compliance datastore once schema is finalised.
  void record;
}

async function appendToFile(record: AuditLogRecord): Promise<void> {
  ensureDirectory();
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(LOG_FILE_PATH, line, { encoding: 'utf8' });
}

export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  const record: AuditLogRecord = {
    ts: new Date().toISOString(),
    ...payload
  };

  await persistToDatabase(record);
  await appendToFile(record);
}

export function getAuditLogPath(): string {
  ensureDirectory();
  return LOG_FILE_PATH;
}

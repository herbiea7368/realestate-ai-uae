import { promises as fs } from 'fs';
import path from 'path';
import { getAuditLogPath, logAuditEvent } from '../src/audit/audit.logger';

describe('audit logger', () => {
  const logPath = getAuditLogPath();

  beforeEach(async () => {
    await fs.rm(logPath, { force: true });
  });

  it('appends audit events as JSON lines', async () => {
    const payload = {
      route: 'permits',
      method: 'POST',
      status: 200,
      body: { trakheesi_number: '12345678' },
      result: { status: 'valid' },
      userId: 'agent-1'
    };

    await logAuditEvent(payload);

    const contents = await fs.readFile(logPath, 'utf8');
    const lines = contents
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    expect(lines.length).toBe(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject(payload);
    expect(typeof entry.ts).toBe('string');
    expect(new Date(entry.ts).toString()).not.toBe('Invalid Date');
  });

  it('ensures the log directory exists', async () => {
    const directory = path.dirname(logPath);
    await fs.rm(logPath, { force: true });
    await logAuditEvent({
      route: 'nlp/listing-writer',
      method: 'POST',
      status: 201
    });
    const exists = await fs
      .stat(directory)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });
});

import { promises as fs } from 'fs';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../src/index';
import { addUser } from '../src/auth/users.store';
import { getAuditLogPath, logAuditEvent } from '../src/audit/audit.logger';

const ADMIN_EMAIL = 'audit-admin@example.com';
const ADMIN_PASSWORD = 'AuditAdmin123!';

async function loginAdmin(): Promise<string> {
  const response = await request(app)
    .post('/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (response.status !== 200) {
    throw new Error(`admin login failed with status ${response.status}`);
  }
  return response.body.token as string;
}

describe('audit export endpoint', () => {
  const logPath = getAuditLogPath();

  beforeAll(() => {
    addUser({
      id: randomUUID(),
      email: ADMIN_EMAIL,
      passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      role: 'admin',
      restricted: false
    });
  });

  beforeEach(async () => {
    await fs.rm(logPath, { force: true });
    await logAuditEvent({
      route: 'permits',
      method: 'POST',
      status: 200,
      userId: 'test-user',
      action: 'TEST'
    });
    await logAuditEvent({
      route: 'pdpl/dsr',
      method: 'POST',
      status: 200,
      userId: 'test-admin',
      action: 'DSR'
    });
  });

  it('streams audit records as NDJSON for admin users', async () => {
    const token = await loginAdmin();

    const response = await request(app)
      .get('/audit/export')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/x-ndjson');
    const lines = response.text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      const entry = JSON.parse(line);
      expect(entry.ts).toBeDefined();
      expect(entry.route).toBeDefined();
    }
  });
});


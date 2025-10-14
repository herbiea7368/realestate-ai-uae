import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';
import request from 'supertest';
import app from '../src/index';
import { addUser } from '../src/auth/users.store';
import { getAuditLogPath } from '../src/audit/audit.logger';
import { resetConsentLedger, setConsent } from '../src/pdpl/service';

const ADMIN_EMAIL = 'compliance@example.com';
const ADMIN_PASSWORD = 'AdminPass123!';

async function ensureAdminToken(): Promise<string> {
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  if (loginResponse.status !== 200) {
    throw new Error(`admin login failed with status ${loginResponse.status}`);
  }

  return loginResponse.body.token as string;
}

describe('PDPL DSR endpoints', () => {
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
    resetConsentLedger();
    await fs.rm(logPath, { force: true });
  });

  it('returns access data and anonymises records with audit logging', async () => {
    const subjectId = randomUUID();
    const subjectEmail = `user-${Date.now()}@example.com`;
    addUser({
      id: subjectId,
      email: subjectEmail,
      passwordHash: bcrypt.hashSync('UserPass123!', 8),
      role: 'agent',
      displayName: 'Dubai Agent Two',
      phone: '+971500000000',
      restricted: false
    });
    setConsent(subjectId, true);

    const adminToken = await ensureAdminToken();

    const accessResponse = await request(app)
      .post('/pdpl/dsr/access')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: subjectId });

    expect(accessResponse.status).toBe(200);
    expect(accessResponse.body.user).toMatchObject({
      id: subjectId,
      email: subjectEmail,
      restricted: false
    });
    expect(accessResponse.body.consent).toEqual(
      expect.objectContaining({
        consent: true
      })
    );

    const eraseResponse = await request(app)
      .post('/pdpl/dsr/erase')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: subjectId });

    expect(eraseResponse.status).toBe(200);
    expect(eraseResponse.body.user).toMatchObject({
      id: subjectId,
      restricted: true
    });
    expect(eraseResponse.body.user.email).toContain('anonymized');

    const lines = (await fs.readFile(logPath, 'utf8'))
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    expect(lines).not.toHaveLength(0);
    for (const entry of lines) {
      expect(entry.action).toBe('DSR');
      expect(entry.route).toBe('pdpl/dsr');
      expect(entry.method).toMatch(/POST/i);
    }
  });
});

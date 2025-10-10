import request from 'supertest';
import app from '../src/index';
import { translate } from '../src/i18n';
import { clearPermitCache, seedPermit } from '../src/permits/service';

describe('permits endpoints', () => {
  beforeEach(async () => {
    await clearPermitCache();
  });

  it('TC-001 validates 8-digit trakheesi numbers that do not end with 0', async () => {
    const response = await request(app)
      .post('/permits/check')
      .query({ lang: 'en' })
      .send({ trakheesi_number: '12345678' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('valid');
    expect(response.body.expiresAt).toBeGreaterThan(Date.now());
    expect(response.body.message).toBe('Permit verified and active.');
    expect(response.body.trakheesi_number).toBe('12345678');
    expect(response.body.source).toBe('provider');
  });

  it('TC-002 handles invalid and expired permits', async () => {
    const invalidResponse = await request(app)
      .post('/permits/check')
      .query({ lang: 'en' })
      .send({ trakheesi_number: '76543210' });

    expect(invalidResponse.status).toBe(200);
    expect(invalidResponse.body.status).toBe('invalid');
    expect(invalidResponse.body.message).toBe('Permit Invalid or Expired');
    expect(invalidResponse.body.source).toBe('provider');

    const trakheesi = '99999999';
    // Seed an expired record to simulate stale cache.
    await seedPermit(trakheesi, { status: 'valid', expiresAt: Date.now() - 1 });

    const expiresResponse = await request(app)
      .get('/permits/status')
      .query({ trakheesi, lang: 'ar' });

    expect(expiresResponse.status).toBe(200);
    expect(expiresResponse.body.status).toBe('expired');
    const expectedMessage = translate('ar', 'permits.expired');
    expect(expiresResponse.body.message).toBe(expectedMessage);
    expect(expiresResponse.body.source).toBe('cache');
  });
});

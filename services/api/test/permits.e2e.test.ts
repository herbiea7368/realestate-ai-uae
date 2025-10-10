import request from 'supertest';
import app from '../src/index';
import { checkPermit, clearPermitCache, seedPermit } from '../src/permits/service';

describe('permits endpoints', () => {
  beforeEach(() => {
    clearPermitCache();
  });

  it('TC-001 validates 8-digit trakheesi numbers that do not end with 0', async () => {
    const response = await request(app)
      .post('/permits/check')
      .send({ trakheesi_number: '12345678' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('valid');
    expect(response.body.expiresAt).toBeGreaterThan(Date.now());
  });

  it('TC-002 handles invalid and expired permits', async () => {
    const invalidResponse = await request(app)
      .post('/permits/check')
      .send({ trakheesi_number: '76543210' });

    expect(invalidResponse.status).toBe(200);
    expect(invalidResponse.body.status).toBe('invalid');

    const trakheesi = '99999999';
    // Seed an expired record to simulate stale cache.
    seedPermit(trakheesi, { status: 'valid', expiresAt: Date.now() - 1 });

    const expiresResponse = await request(app)
      .get('/permits/status')
      .query({ trakheesi });

    expect(expiresResponse.status).toBe(200);
    expect(expiresResponse.body.status).toBe('expired');
  });
});

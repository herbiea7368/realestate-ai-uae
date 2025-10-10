import request from 'supertest';
import app from '../src/index';
import { resetConsentLedger } from '../src/pdpl/service';

describe('PDPL consent endpoints', () => {
  beforeEach(() => {
    resetConsentLedger();
  });

  it('persists consent decisions', async () => {
    const userId = 'user-123';

    const saveResponse = await request(app)
      .post('/pdpl/consent')
      .send({ userId, consent: true });

    expect(saveResponse.status).toBe(201);
    expect(saveResponse.body).toMatchObject({
      userId,
      consent: true
    });
    expect(typeof saveResponse.body.timestamp).toBe('number');

    const fetchResponse = await request(app).get(`/pdpl/consent/${userId}`);
    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body).toMatchObject({
      userId,
      consent: true
    });
    expect(fetchResponse.body.timestamp).toBe(saveResponse.body.timestamp);
  });

  it('returns 404 when consent is missing', async () => {
    const response = await request(app).get('/pdpl/consent/missing-user');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('not_found');
  });
});

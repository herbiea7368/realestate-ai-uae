import request from 'supertest';
import app from '../src/index';
import { clearPermitCache, seedPermit } from '../src/permits/service';

async function loginDefaultAgent() {
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({ email: 'agent@example.com', password: 'secret12' });

  if (loginResponse.status !== 200) {
    throw new Error(
      `expected default agent login to succeed, got ${loginResponse.status} ${JSON.stringify(loginResponse.body)}`
    );
  }

  return loginResponse.body.token as string;
}

describe('listing writer endpoint', () => {
  beforeEach(async () => {
    await clearPermitCache();
  });

  it('returns deterministic copy for valid permits', async () => {
    await request(app)
      .post('/permits/check')
      .query({ lang: 'en' })
      .send({ trakheesi_number: '11112222' });

    const token = await loginDefaultAgent();

    const response = await request(app)
      .post('/nlp/listing-writer')
      .query({ lang: 'en' })
      .send({
        trakheesi_number: '11112222',
        features: ['pool', 'sea view'],
        language: 'en',
        titleHints: 'Luxury 2BR'
      })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      toxicity_flag: false,
      permit_status: 'valid',
      message: 'Listing copy generated successfully.'
    });
    expect(String(response.body.text)).toContain('11112222');
    expect(String(response.body.text)).toContain('Luxury 2BR');
  });

  it('blocks requests when permit is invalid or expired', async () => {
    const token = await loginDefaultAgent();

    const invalidResponse = await request(app)
      .post('/nlp/listing-writer')
      .query({ lang: 'en' })
      .send({
        trakheesi_number: '11112220',
        language: 'en'
      })
      .set('Authorization', `Bearer ${token}`);

    expect(invalidResponse.status).toBe(422);
    expect(invalidResponse.body.error).toBe('permit_not_valid');
    expect(invalidResponse.body.message).toBe('Permit must be valid before generating copy.');

    const trakheesi = '88887777';
    await seedPermit(trakheesi, { status: 'valid', expiresAt: Date.now() - 10 });

    const expiredResponse = await request(app)
      .post('/nlp/listing-writer')
      .query({ lang: 'ar' })
      .send({
        trakheesi_number: trakheesi,
        language: 'en'
      })
      .set('Authorization', `Bearer ${token}`);

    expect(expiredResponse.status).toBe(422);
    expect(expiredResponse.body.status).toBe('expired');
    expect(expiredResponse.body.message).toBe('يجب أن يكون الترخيص صالحاً قبل إنشاء الوصف.');
  });
});

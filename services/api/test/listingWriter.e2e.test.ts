import request from 'supertest';
import app from '../src/index';
import { clearPermitCache, seedPermit } from '../src/permits/service';

describe('listing writer endpoint', () => {
  beforeEach(() => {
    clearPermitCache();
  });

  it('returns deterministic copy for valid permits', async () => {
    await request(app)
      .post('/permits/check')
      .query({ lang: 'en' })
      .send({ trakheesi_number: '11112222' });

    const response = await request(app)
      .post('/nlp/listing-writer')
      .query({ lang: 'en' })
      .send({
        trakheesi_number: '11112222',
        features: ['pool', 'sea view'],
        language: 'en',
        titleHints: 'Luxury 2BR'
      });

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
    const invalidResponse = await request(app)
      .post('/nlp/listing-writer')
      .query({ lang: 'en' })
      .send({
        trakheesi_number: '11112220',
        language: 'en'
      });

    expect(invalidResponse.status).toBe(422);
    expect(invalidResponse.body.error).toBe('permit_not_valid');
    expect(invalidResponse.body.message).toBe('Permit must be valid before generating copy.');

    const trakheesi = '88887777';
    seedPermit(trakheesi, { status: 'valid', expiresAt: Date.now() - 10 });

    const expiredResponse = await request(app)
      .post('/nlp/listing-writer')
      .query({ lang: 'ar' })
      .send({
        trakheesi_number: trakheesi,
        language: 'en'
      });

    expect(expiredResponse.status).toBe(422);
    expect(expiredResponse.body.status).toBe('expired');
    expect(expiredResponse.body.message).toBe('يجب أن يكون الترخيص صالحاً قبل إنشاء الوصف.');
  });
});

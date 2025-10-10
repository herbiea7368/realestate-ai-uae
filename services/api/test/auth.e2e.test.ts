import request from 'supertest';
import app from '../src/index';

describe('auth endpoints', () => {
  it('registers, logs in, and returns the profile', async () => {
    const email = `user-${Date.now()}@test.dev`;
    const password = 'ValidPass123';

    const registerResponse = await request(app)
      .post('/auth/register')
      .send({ email, password });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toBeDefined();

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    const meResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.email).toBe(email.toLowerCase());
    expect(meResponse.body.role).toBe('agent');
  });

  it('rejects listing writer access without a token', async () => {
    const response = await request(app).post('/nlp/listing-writer').send({
      trakheesi_number: '12341234',
      language: 'en'
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('unauthorized');
  });
});

import request from 'supertest';
import app from '../src/index';

jest.mock('@realestate-ai-uae/marketing', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

const { sendWelcomeEmail } = jest.requireMock('@realestate-ai-uae/marketing') as {
  sendWelcomeEmail: jest.Mock;
};

describe('auth marketing automation', () => {
  it('sends a welcome email when a user registers', async () => {
    const email = `welcome-${Date.now()}@test.dev`;
    const password = 'ValidPass123';

    const response = await request(app).post('/auth/register').send({ email, password });

    expect(response.status).toBe(201);
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      email.toLowerCase(),
      expect.stringContaining('welcome-'),
    );
  });
});

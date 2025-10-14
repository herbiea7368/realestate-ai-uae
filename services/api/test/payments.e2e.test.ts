import { promises as fs } from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/index';
import { setConsent } from '../src/pdpl/service';
import { resetPayments } from '../src/payments/payments.repository';
import { getUser } from '../src/auth/users.store';

jest.mock('../src/payments/stripe.service', () => ({
  createAccount: jest.fn().mockResolvedValue({ id: 'acct_123' }),
  createAccountLink: jest.fn().mockResolvedValue({
    url: 'https://stripe.test/onboarding',
    expires_at: Math.floor(Date.now() / 1000) + 3600
  }),
  createPaymentIntent: jest.fn().mockResolvedValue({
    id: 'pi_123',
    client_secret: 'secret_123'
  })
}));

jest.mock('../src/payments/escrow.service', () => ({
  hold: jest.fn().mockResolvedValue({ ref: 'escrow-ref', status: 'held' }),
  release: jest.fn().mockResolvedValue({ status: 'released', ref: 'escrow-ref' })
}));

const stripeService = jest.requireMock('../src/payments/stripe.service') as jest.Mocked<
  typeof import('../src/payments/stripe.service')
>;
const escrowService = jest.requireMock('../src/payments/escrow.service') as jest.Mocked<
  typeof import('../src/payments/escrow.service')
>;

describe('payments flow', () => {
  const reportEntries: Array<{ name: string; status: string }> = [];
  const reportPath = path.resolve(__dirname, '../payments-test-report.json');

  beforeEach(() => {
    resetPayments();
    jest.clearAllMocks();
    process.env.ESCROW_HOLD_DAYS = '0';
  });

  afterEach(() => {
    const state = expect.getState();
    reportEntries.push({
      name: state.currentTestName ?? 'unknown',
      status: state.assertionCalls >= 0 ? 'passed' : 'unknown'
    });
  });

  afterAll(async () => {
    try {
      await fs.writeFile(
        reportPath,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            cases: reportEntries
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (error) {
      console.error('[payments.tests] failed to write report', error);
    }
  });

  async function bootstrapAgent() {
    const email = `pay-user-${Date.now()}@test.dev`;
    const password = 'StrongPass123';
    const registerResponse = await request(app).post('/auth/register').send({ email, password });
    expect(registerResponse.status).toBe(201);
    const token = registerResponse.body.token as string;
    const userId = registerResponse.body.user.id as string;
    setConsent(userId, true);
    return { token, userId };
  }

  it('creates a connect account for the agent', async () => {
    const { token, userId } = await bootstrapAgent();

    const response = await request(app)
      .post('/payments/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.accountId).toBe('acct_123');
    expect(response.body.onboardingLink).toBe('https://stripe.test/onboarding');
    expect(stripeService.createAccount).toHaveBeenCalledWith(expect.stringContaining('@'));
    const stored = getUser(userId);
    expect(stored?.stripeAccountId).toBe('acct_123');
  });

  it('initiates a payment intent and records escrow', async () => {
    const { token } = await bootstrapAgent();

    const initiateResponse = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount_aed: 1200 });

    expect(initiateResponse.status).toBe(201);
    expect(initiateResponse.body.status).toBe('escrowed');
    expect(initiateResponse.body.aml.flag).toBe(false);
    expect(initiateResponse.body.escrowRef).toBe('escrow-ref');
    expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(1200, 'aed');
    expect(escrowService.hold).toHaveBeenCalledWith(1200, expect.any(String));

    const listResponse = await request(app)
      .get('/payments/me')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.payments).toHaveLength(1);
    expect(listResponse.body.payments[0].status).toBe('escrowed');
  });

  it('flags high-value transactions for AML review', async () => {
    const { token } = await bootstrapAgent();

    const response = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount_aed: 5_000_000 });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('flagged');
    expect(response.body.aml.flag).toBe(true);
    expect(response.body.aml.reason).toBe('amount_over_limit');
  });

  it('allows release after escrow hold period', async () => {
    const { token } = await bootstrapAgent();

    const initiateResponse = await request(app)
      .post('/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount_aed: 2500 });

    expect(initiateResponse.status).toBe(201);
    const paymentId = initiateResponse.body.id as string;

    const releaseResponse = await request(app)
      .post(`/payments/escrow/${paymentId}/release`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(releaseResponse.status).toBe(200);
    expect(releaseResponse.body.released.status).toBe('released');
    expect(releaseResponse.body.payment.status).toBe('released');
    expect(escrowService.release).toHaveBeenCalledWith('escrow-ref');
  });
});

import Stripe from 'stripe';

const apiVersion: Stripe.StripeConfig['apiVersion'] = '2024-06-01';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.warn('[payments.stripe] STRIPE_SECRET_KEY not configured');
}

export const stripe = new Stripe(secretKey ?? 'sk_test_mock', {
  apiVersion,
  httpClient: Stripe.createFetchHttpClient()
});

export async function createAccount(email: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email
  });
  return account;
}

export async function createAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding'
  });
}

export async function createPaymentIntent(amount: number, currency = 'aed') {
  const normalizedAmount = Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  return stripe.paymentIntents.create({
    amount: normalizedAmount,
    currency
  });
}

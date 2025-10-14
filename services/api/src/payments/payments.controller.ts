import { Router } from 'express';
import type { Request } from 'express';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getConsent } from '../pdpl/service';
import { getUser, linkStripeAccount } from '../auth/users.store';
import { amlCheck, logCompliance } from './compliance.service';
import { createAccount, createAccountLink, createPaymentIntent } from './stripe.service';
import { hold, release } from './escrow.service';
import {
  createPayment,
  getPayment,
  listPaymentsForUser,
  updatePayment
} from './payments.repository';

const paymentsRouter = Router();

const initiateSchema = z.object({
  amount_aed: z.number().positive().min(1),
  currency: z
    .string()
    .regex(/^[a-z]{3}$/i)
    .default('aed')
});

const connectSchema = z.object({
  returnUrl: z.string().url().optional(),
  refreshUrl: z.string().url().optional()
});

function requireAuthenticatedUser(req: Request) {
  if (!req.user) {
    return null;
  }
  return req.user;
}

function ensureConsent(userId: string) {
  const consentRecord = getConsent(userId);
  if (!consentRecord || consentRecord.consent !== true) {
    return false;
  }
  return true;
}

function resolveHoldDays() {
  const raw = Number(process.env.ESCROW_HOLD_DAYS ?? 7);
  if (!Number.isFinite(raw) || raw < 0) {
    return 7;
  }
  return Math.floor(raw);
}

paymentsRouter.post('/connect', async (req, res) => {
  const user = requireAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (user.role !== 'agent' && user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  if (!ensureConsent(user.sub)) {
    return res.status(403).json({ error: 'consent_required' });
  }

  const storedUser = getUser(user.sub);
  if (!storedUser) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  const parsed = connectSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  try {
    const account = await createAccount(user.email);
    linkStripeAccount(user.sub, account.id);
    const baseUrl = process.env.SITE_BASE_URL ?? 'http://localhost:3000';
    const { returnUrl, refreshUrl } = parsed.data;
    const link = await createAccountLink(
      account.id,
      returnUrl ?? `${baseUrl}/finance/onboarding/success`,
      refreshUrl ?? `${baseUrl}/finance/onboarding/retry`
    );
    console.info('[payments.connect]', { userId: user.sub, accountId: account.id });
    return res.status(201).json({
      accountId: account.id,
      onboardingLink: link.url,
      expiresAt: link.expires_at
    });
  } catch (error) {
    console.error('[payments.connect] failed to create connect account', error);
    return res.status(502).json({ error: 'stripe_error' });
  }
});

paymentsRouter.post('/initiate', async (req, res) => {
  const user = requireAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!ensureConsent(user.sub)) {
    return res.status(403).json({ error: 'consent_required' });
  }
  const storedUser = getUser(user.sub);
  if (!storedUser) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  const parsed = initiateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const { amount_aed, currency } = parsed.data;

  const amlPayload = { amount_aed, user_id: user.sub };
  const aml = amlCheck(amlPayload);
  await logCompliance(aml, amlPayload);

  try {
    const intent = await createPaymentIntent(amount_aed, currency);
    const escrow = await hold(amount_aed, user.sub);
    const status = aml.flag ? 'flagged' : 'escrowed';
    const payment = createPayment({
      userId: user.sub,
      amountAed: amount_aed,
      status,
      stripePaymentId: intent.id,
      bankEscrowRef: escrow.ref,
      aml
    });
    console.info('[payments.initiate]', {
      paymentId: payment.id,
      userId: user.sub,
      amount_aed,
      status
    });
    return res.status(201).json({
      id: payment.id,
      status,
      stripePaymentId: intent.id,
      clientSecret: intent.client_secret ?? null,
      escrowRef: escrow.ref,
      aml
    });
  } catch (error) {
    console.error('[payments.initiate] failed to process payment', error);
    return res.status(502).json({ error: 'payment_error' });
  }
});

paymentsRouter.post('/escrow/:id/release', async (req, res) => {
  const user = requireAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const paymentId = req.params.id;
  const payment = getPayment(paymentId);
  if (!payment) {
    return res.status(404).json({ error: 'not_found' });
  }
  const holdDays = resolveHoldDays();
  const releaseDate = dayjs(payment.createdAt).add(holdDays, 'day');
  const isOwner = payment.userId === user.sub;
  if (user.role !== 'admin') {
    if (!isOwner) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (dayjs().isBefore(releaseDate)) {
      return res
        .status(422)
        .json({ error: 'escrow_hold_active', releaseAvailableAt: releaseDate.toISOString() });
    }
  }
  if (payment.status === 'released') {
    return res.json({ released: { status: 'already_released', ref: payment.bankEscrowRef } });
  }
  if (!payment.bankEscrowRef) {
    return res.status(409).json({ error: 'missing_escrow_reference' });
  }
  try {
    const releaseResult = await release(payment.bankEscrowRef);
    const updated = updatePayment(payment.id, { status: 'released' });
    console.info('[payments.release]', {
      paymentId: payment.id,
      userId: user.sub,
      releaseStatus: releaseResult.status
    });
    return res.json({
      released: releaseResult,
      payment: {
        id: updated?.id ?? payment.id,
        status: updated?.status ?? 'released',
        updatedAt: updated?.updatedAt ?? new Date()
      }
    });
  } catch (error) {
    console.error('[payments.release] failed to release escrow', error);
    return res.status(502).json({ error: 'escrow_error' });
  }
});

paymentsRouter.get('/me', (req, res) => {
  const user = requireAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!ensureConsent(user.sub)) {
    return res.status(403).json({ error: 'consent_required' });
  }
  const payments = listPaymentsForUser(user.sub).map((payment) => ({
    id: payment.id,
    status: payment.status,
    amount_aed: payment.amountAed,
    stripePaymentId: payment.stripePaymentId ?? null,
    bankEscrowRef: payment.bankEscrowRef ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
    aml: payment.aml ?? null
  }));
  return res.json({ payments });
});

export default paymentsRouter;

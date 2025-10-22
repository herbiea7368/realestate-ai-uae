import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { signToken } from './jwt';
import { addUser, assignUserRole, getByEmail, getUser } from './users.store';
import { requireAuth } from './middleware';
import { sendWelcomeEmail } from '@realestate-ai-uae/marketing';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const router = Router();

function toSafeEmail(email: string) {
  return email.trim().toLowerCase();
}

router.post('/register', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const email = toSafeEmail(parsed.data.email);
  if (getByEmail(email)) {
    return res.status(409).json({ error: 'account_exists' });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  let user = addUser({
    id: randomUUID(),
    email,
    passwordHash,
    role: 'buyer',
    roles: ['buyer']
  });
  const defaultAdminEmail = (process.env.DEFAULT_ADMIN_EMAIL ?? '').trim().toLowerCase();
  if (defaultAdminEmail && email === defaultAdminEmail) {
    user = assignUserRole(user.id, 'admin') ?? user;
  }
  const claims = {
    sub: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles
  };
  const welcomeName = parsed.data.email.split('@')[0] ?? parsed.data.email;
  sendWelcomeEmail(email, welcomeName).catch((err: unknown) => {
    console.error('sendWelcomeEmail_failed', err);
  });
  const token = signToken(claims);
  res.cookie('id_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles
    }
  });
});

router.post('/login', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const email = toSafeEmail(parsed.data.email);
  const existing = getByEmail(email);
  if (!existing) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const matches = await bcrypt.compare(parsed.data.password, existing.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const claims = {
    sub: existing.id,
    email: existing.email,
    role: existing.role,
    roles: existing.roles
  };
  const token = signToken(claims);
  res.cookie('id_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  return res.json({
    token,
    user: {
      id: existing.id,
      email: existing.email,
      role: existing.role,
      roles: existing.roles
    }
  });
});

router.get('/me', requireAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const current = getUser(req.user.sub);
  if (!current) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.json({
    id: current.id,
    email: current.email,
    role: current.role,
    roles: current.roles,
    displayName: current.displayName,
    phone: current.phone
  });
});

export default router;

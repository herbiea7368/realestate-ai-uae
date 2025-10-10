import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { signToken } from './jwt';
import { addUser, getByEmail, getUser } from './users.store';
import { requireAuth } from './middleware';

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
  const user = addUser({
    id: randomUUID(),
    email,
    passwordHash,
    role: 'agent'
  });
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
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
      role: user.role
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
  const token = signToken({ sub: existing.id, email: existing.email, role: existing.role });
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
      role: existing.role
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
    displayName: current.displayName,
    phone: current.phone
  });
});

export default router;

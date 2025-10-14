import { Router } from 'express';
import { z } from 'zod';
import {
  anonymizeUser,
  getUser,
  rectifyUser,
  setUserRestriction
} from '../auth/users.store';
import { getConsent } from './service';

const dsrRouter = Router();

const userIdSchema = z.object({
  userId: z.string().min(1)
});

const rectifySchema = z
  .object({
    userId: z.string().min(1),
    email: z.string().email().optional(),
    displayName: z.string().min(1).max(120).optional(),
    phone: z
      .string()
      .regex(/^[\d+().\- ]{6,20}$/)
      .optional()
  })
  .refine((data) => data.email ?? data.displayName ?? data.phone, {
    message: 'empty_update'
  });

const restrictSchema = z.object({
  userId: z.string().min(1),
  restricted: z.boolean().default(true)
});

function serializeUser(user: ReturnType<typeof getUser>) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName ?? null,
    phone: user.phone ?? null,
    restricted: Boolean(user.restricted)
  };
}

dsrRouter.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
});

dsrRouter.post('/access', (req, res) => {
  const parsed = userIdSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const { userId } = parsed.data;
  const user = getUser(userId);
  if (!user) {
    return res.status(404).json({ error: 'not_found' });
  }
  const consent = getConsent(userId) ?? null;
  return res.json({
    user: serializeUser(user),
    consent
  });
});

dsrRouter.post('/rectify', (req, res) => {
  const parsed = rectifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  try {
    const updated = rectifyUser(parsed.data.userId, {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      phone: parsed.data.phone
    });
    if (!updated) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({
      user: serializeUser(updated)
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'email_in_use') {
      return res.status(409).json({ error: 'email_in_use' });
    }
    return res.status(500).json({ error: 'server_error' });
  }
});

dsrRouter.post('/erase', (req, res) => {
  const parsed = userIdSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const anonymized = anonymizeUser(parsed.data.userId);
  if (!anonymized) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.json({
    user: serializeUser(anonymized)
  });
});

dsrRouter.post('/restrict', (req, res) => {
  const parsed = restrictSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const updated = setUserRestriction(parsed.data.userId, parsed.data.restricted);
  if (!updated) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.json({
    user: serializeUser(updated)
  });
});

export default dsrRouter;

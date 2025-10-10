import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { getUser, updateUser } from '../auth/users.store';

const updateSchema = z
  .object({
    displayName: z
      .string()
      .min(1)
      .max(120)
      .optional(),
    phone: z
      .string()
      .regex(/^[\d+().\- ]{6,20}$/)
      .optional()
  })
  .refine((data) => data.displayName !== undefined || data.phone !== undefined, {
    message: 'empty_update'
  });

const router = Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const profile = getUser(req.user.sub);
  if (!profile) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.json({
    id: profile.id,
    email: profile.email,
    role: profile.role,
    displayName: profile.displayName ?? null,
    phone: profile.phone ?? null
  });
});

router.patch('/', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const updated = updateUser(req.user.sub, parsed.data);
  if (!updated) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.json({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    displayName: updated.displayName ?? null,
    phone: updated.phone ?? null
  });
});

export default router;

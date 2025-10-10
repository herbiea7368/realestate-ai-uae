import { Router } from 'express';
import { z } from 'zod';
import { getConsent, setConsent } from './service';

const pdplRouter = Router();

const consentSchema = z.object({
  userId: z.string().min(1),
  consent: z.boolean()
});

pdplRouter.post('/consent', (req, res) => {
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const { userId, consent } = parsed.data;
  const record = setConsent(userId, consent);
  return res.status(201).json({ userId, ...record });
});

pdplRouter.get('/consent/:userId', (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'missing_user' });
  }

  const record = getConsent(userId);
  if (!record) {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.json({ userId, ...record });
});

export default pdplRouter;

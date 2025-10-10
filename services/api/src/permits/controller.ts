import { Router } from 'express';
import { z } from 'zod';
import { checkPermit, getPermit } from './service';

const payloadSchema = z.object({
  trakheesi_number: z.string()
});

const permitsRouter = Router();

permitsRouter.post('/check', (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const result = checkPermit(parsed.data.trakheesi_number);
  return res.json(result);
});

permitsRouter.get('/status', (req, res) => {
  const trakheesi = typeof req.query.trakheesi === 'string' ? req.query.trakheesi : '';
  if (!trakheesi) {
    return res.status(400).json({ error: 'missing_trakheesi' });
  }
  const result = getPermit(trakheesi);
  return res.json(result);
});

export default permitsRouter;

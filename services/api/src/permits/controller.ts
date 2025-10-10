import { Router } from 'express';
import { z } from 'zod';
import { resolveLanguage, translate } from '../i18n';
import type { SupportedLang } from '../i18n';
import { checkPermit, getPermit, type PermitResult } from './service';

const payloadSchema = z.object({
  trakheesi_number: z.string()
});

const permitsRouter = Router();

function serializePermit(trakheesi_number: string, data: PermitResult, lang: SupportedLang) {
  return {
    trakheesi_number,
    status: data.status,
    expiresAt: data.expiresAt,
    source: data.source,
    message: translate(lang, `permits.${data.status}`)
  };
}

permitsRouter.post('/check', async (req, res) => {
  const lang = resolveLanguage(req.query.lang);
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const userId = req.user?.sub ?? null;
  const result = await checkPermit(parsed.data.trakheesi_number);
  // Simple compliance log for audit and TDRA traceability
  console.info('[permits.check]', {
    trakheesi: parsed.data.trakheesi_number,
    userId,
    consented: Boolean(req.user)
  });
  return res.json(serializePermit(parsed.data.trakheesi_number, result, lang));
});

permitsRouter.get('/status', async (req, res) => {
  const lang = resolveLanguage(req.query.lang);
  const trakheesi = typeof req.query.trakheesi === 'string' ? req.query.trakheesi : '';
  if (!trakheesi) {
    return res.status(400).json({ error: 'missing_trakheesi' });
  }
  const result = await getPermit(trakheesi);
  return res.json(serializePermit(trakheesi, result, lang));
});

export default permitsRouter;

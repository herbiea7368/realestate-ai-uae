import { Router } from 'express';
import { z } from 'zod';
import { getPermit } from '../permits/service';

const listingWriterRouter = Router();

const requestSchema = z.object({
  titleHints: z.string().optional(),
  features: z.array(z.string()).default([]),
  trakheesi_number: z.string(),
  language: z.enum(['en', 'ar']).default('en')
});

listingWriterRouter.post('/', (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }
  const { trakheesi_number, language, titleHints, features } = parsed.data;
  const permit = getPermit(trakheesi_number);
  if (permit.status !== 'valid') {
    return res.status(422).json({ error: 'permit_not_valid', status: permit.status });
  }

  const headline = titleHints ?? (language === 'ar' ? 'قائمة جديدة' : 'New listing');
  const featureList = features.length ? features.join(', ') : language === 'ar' ? 'بدون ميزات مضافة' : 'No highlighted features';
  const text =
    language === 'ar'
      ? `(${language}) التصريح ${trakheesi_number} | ${headline}. الميزات: ${featureList}.`
      : `[${language}] Permit ${trakheesi_number}: ${headline}. Features: ${featureList}.`;

  return res.json({
    text,
    toxicity_flag: false,
    permit_status: permit.status,
    expiresAt: permit.expiresAt
  });
});

export default listingWriterRouter;

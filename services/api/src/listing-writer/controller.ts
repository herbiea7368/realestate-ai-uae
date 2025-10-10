import { Router } from 'express';
import { z } from 'zod';
import { resolveLanguage, translate } from '../i18n';
import { getPermit } from '../permits/service';

const listingWriterRouter = Router();

const requestSchema = z.object({
  titleHints: z.string().optional(),
  features: z.array(z.string()).default([]),
  trakheesi_number: z.string(),
  language: z.enum(['en', 'ar']).default('en')
});

listingWriterRouter.post('/', (req, res) => {
  const lang = resolveLanguage(req.query.lang);
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const { trakheesi_number, language, titleHints, features } = parsed.data;
  const permit = getPermit(trakheesi_number);
  if (permit.status !== 'valid') {
    return res.status(422).json({
      error: 'permit_not_valid',
      status: permit.status,
      message: translate(lang, 'listing.invalidPermit')
    });
  }

  const headline = titleHints ?? translate(language, 'listing.defaultHeadline');
  const featureSeparator = language === 'ar' ? '، ' : ', ';
  const featureList =
    features.length > 0 ? features.join(featureSeparator) : translate(language, 'listing.noFeatures');

  const text = translate(language, 'listing.summary', {
    trakheesi: trakheesi_number,
    headline,
    features: featureList
  });

  return res.json({
    text,
    message: translate(lang, 'listing.success'),
    toxicity_flag: false,
    permit_status: permit.status,
    expiresAt: permit.expiresAt
  });
});

export default listingWriterRouter;

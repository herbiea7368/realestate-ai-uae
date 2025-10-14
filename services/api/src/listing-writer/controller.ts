import { Router } from 'express';
import { z } from 'zod';
import { resolveLanguage, translate } from '../i18n';
import { getPermit } from '../permits/service';
import { getConsent } from '../pdpl/service';
import { moderate } from '../moderation/moderation.service';
import { getUser } from '../auth/users.store';

const listingWriterRouter = Router();

const requestSchema = z.object({
  titleHints: z.string().optional(),
  features: z.array(z.string()).default([]),
  trakheesi_number: z.string(),
  language: z.enum(['en', 'ar']).default('en')
});

listingWriterRouter.post('/', async (req, res) => {
  const lang = resolveLanguage(req.query.lang);
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_payload' });
  }

  const { trakheesi_number, language, titleHints, features } = parsed.data;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const consentRecord = getConsent(user.sub);
  if (!consentRecord || consentRecord.consent !== true) {
    return res.status(403).json({ error: 'consent_required' });
  }

  const storedUser = getUser(user.sub);
  if (!storedUser) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  if (storedUser.restricted) {
    return res.status(423).json({ error: 'processing_restricted' });
  }
  const permit = await getPermit(trakheesi_number);
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

  const moderationResult = moderate(text);
  const shouldBlock =
    moderationResult.flagged &&
    user.role !== 'admin' &&
    (moderationResult.score >= moderationResult.threshold || moderationResult.reasons.includes('pii_detected'));

  if (shouldBlock) {
    return res.status(422).json({ error: 'content_flagged', details: moderationResult });
  }

  return res.json({
    text,
    message: translate(lang, 'listing.success'),
    toxicity_flag: moderationResult.flagged,
    moderation: {
      flagged: moderationResult.flagged,
      reasons: moderationResult.reasons,
      score: moderationResult.score,
      threshold: moderationResult.threshold,
      pii: moderationResult.pii
    },
    permit_status: permit.status,
    expiresAt: permit.expiresAt
  });
});

export default listingWriterRouter;

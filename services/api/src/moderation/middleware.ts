import type { NextFunction, Request, Response } from 'express';
import { moderate } from './moderation.service';

const LISTING_PATH_REGEX = /listing/i;
const MODERATED_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function collectCandidateText(body: unknown): string[] {
  if (typeof body === 'string') {
    return [body];
  }

  if (!body || typeof body !== 'object') {
    return [];
  }

  const candidates: string[] = [];
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!['title', 'titleHints', 'description', 'text', 'content', 'message'].includes(key)) {
      continue;
    }
    const value = record[key];
    if (typeof value === 'string') {
      candidates.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          candidates.push(item);
        }
      }
    }
  }
  return candidates;
}

export default function moderationMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!MODERATED_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  if (!LISTING_PATH_REGEX.test(req.path)) {
    return next();
  }

  const texts = collectCandidateText(req.body);
  if (texts.length === 0) {
    return next();
  }

  const result = moderate(texts.join('\n'));
  res.locals.moderation = result;

  if (!result.enabled || !result.flagged) {
    return next();
  }

  if (req.user?.role === 'admin') {
    return next();
  }

  return res.status(422).json({
    error: 'content_flagged',
    details: result
  });
}


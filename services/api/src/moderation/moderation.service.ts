import { detectPII } from './pii';
import { scoreText } from './toxicity';

const DEFAULT_THRESHOLD = 0.8;

export interface ModerationOptions {
  threshold?: number;
}

export interface ModerationResult {
  enabled: boolean;
  flagged: boolean;
  score: number;
  threshold: number;
  reasons: string[];
  pii: ReturnType<typeof detectPII>;
}

function resolveThreshold(threshold?: number): number {
  const fromEnv = Number(process.env.MODERATION_THRESHOLD ?? '');
  const envThreshold = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_THRESHOLD;
  if (typeof threshold === 'number' && Number.isFinite(threshold) && threshold > 0) {
    return threshold;
  }
  return envThreshold;
}

function isModerationEnabled(): boolean {
  return String(process.env.MODERATION_ENABLED ?? 'true').toLowerCase() !== 'false';
}

export function moderate(text: string, options?: ModerationOptions): ModerationResult {
  const enabled = isModerationEnabled();
  const threshold = resolveThreshold(options?.threshold);
  const normalized = text ?? '';
  const score = normalized.trim().length > 0 ? scoreText(normalized) : 0;
  const pii = normalized.trim().length > 0 ? detectPII(normalized) : { phones: [], emails: [] };
  const piiDetected = pii.emails.length > 0 || pii.phones.length > 0;

  if (!enabled) {
    return {
      enabled,
      flagged: false,
      score,
      threshold,
      reasons: [],
      pii
    };
  }

  const reasons: string[] = [];
  if (score >= threshold) {
    reasons.push('toxicity_threshold_exceeded');
  }
  if (piiDetected) {
    reasons.push('pii_detected');
  }

  return {
    enabled,
    flagged: reasons.length > 0,
    score,
    threshold,
    reasons,
    pii
  };
}


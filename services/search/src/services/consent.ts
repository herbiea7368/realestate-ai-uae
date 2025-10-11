const CONSENT_CACHE_TTL = 60 * 1000;

type ConsentCacheEntry = {
  consent: boolean;
  expiresAt: number;
};

const consentCache = new Map<string, ConsentCacheEntry>();

export class ConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentError';
  }
}

export async function ensureUserConsent(userId: string): Promise<void> {
  if (!process.env.ENFORCE_CONSENT || process.env.ENFORCE_CONSENT === 'false') {
    return;
  }

  if (!userId) {
    throw new ConsentError('Missing x-user-id header');
  }

  const cached = consentCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    if (!cached.consent) {
      throw new ConsentError('Consent not granted');
    }
    return;
  }

  const consentServiceUrl =
    process.env.CONSENT_SERVICE_URL ?? 'http://localhost:4001/pdpl/consent';
  const url = `${consentServiceUrl.replace(/\/$/, '')}/${encodeURIComponent(userId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (response.status === 404) {
    consentCache.set(userId, { consent: false, expiresAt: Date.now() + CONSENT_CACHE_TTL });
    throw new ConsentError('Consent record not found');
  }

  if (!response.ok) {
    throw new ConsentError(`Consent lookup failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { consent?: boolean };
  const consent = Boolean(payload.consent);
  consentCache.set(userId, { consent, expiresAt: Date.now() + CONSENT_CACHE_TTL });

  if (!consent) {
    throw new ConsentError('Consent revoked');
  }
}

export function resetConsentCache(): void {
  consentCache.clear();
}

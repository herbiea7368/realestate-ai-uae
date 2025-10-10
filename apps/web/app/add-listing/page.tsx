'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type Banner =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string; details?: string }
  | null;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';
const CONSENT_STORAGE_KEY = 'pdpl-consent';
const USER_ID_STORAGE_KEY = 'pdpl-user-id';

const LANGUAGE_OPTIONS: Array<{ value: 'en' | 'ar'; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' }
];

export default function AddListingPage() {
  const [trakheesi, setTrakheesi] = useState('');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [features, setFeatures] = useState('');
  const [titleHints, setTitleHints] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [consentInitialized, setConsentInitialized] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const t = useTranslations(language);
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const langAttr = language;

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
      return;
    }
    const storedConsent = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    const storedUserId = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    setHasConsent(storedConsent === 'true');
    if (storedUserId) {
      setUserId(storedUserId);
    } else if (window.crypto?.randomUUID) {
      const generated = window.crypto.randomUUID();
      window.localStorage.setItem(USER_ID_STORAGE_KEY, generated);
      setUserId(generated);
    }
    setConsentInitialized(true);
  }, []);

  const parsedFeatures = useMemo(
    () =>
      features
        .split(',')
        .map((feature) => feature.trim())
        .filter(Boolean),
    [features]
  );

  const resetBanner = () => setBanner(null);

  async function handleConsentChange(event: ChangeEvent<HTMLInputElement>) {
    const nextConsent = event.target.checked;
    const previousConsent = hasConsent;
    const ensureUserId =
      userId ??
      (typeof window !== 'undefined' && window.crypto?.randomUUID ? window.crypto.randomUUID() : `anon-${Date.now()}`);

    setConsentSubmitting(true);
    try {
      setUserId(ensureUserId);
      setHasConsent(nextConsent);
      const response = await fetch(`${API_URL}/pdpl/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: ensureUserId, consent: nextConsent })
      });

      if (!response.ok) {
        throw new Error('consent_failed');
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, String(nextConsent));
        window.localStorage.setItem(USER_ID_STORAGE_KEY, ensureUserId);
      }

      if (!nextConsent) {
        setBanner({ type: 'error', message: t('consentRequired') });
      } else {
        resetBanner();
      }
    } catch {
      setHasConsent(previousConsent);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, String(previousConsent));
      }
      setBanner({ type: 'error', message: t('consentRequired') });
    } finally {
      setConsentSubmitting(false);
    }
  }

  const processSubmission = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const permitResponse = await fetch(`${API_URL}/permits/check?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trakheesi_number: trakheesi.trim() })
      });

      if (!permitResponse.ok) {
        const payload = await permitResponse.json().catch(() => ({}));
        const message = typeof payload.message === 'string' ? payload.message : t('error');
        throw new Error(message);
      }

      const permit = await permitResponse.json();
      if (permit.status !== 'valid') {
        setBanner({
          type: 'error',
          message: typeof permit.message === 'string' ? permit.message : t('error')
        });
        return;
      }

      const writerResponse = await fetch(`${API_URL}/nlp/listing-writer?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trakheesi_number: trakheesi.trim(),
          language,
          titleHints: titleHints || undefined,
          features: parsedFeatures
        })
      });

      if (!writerResponse.ok) {
        const payload = await writerResponse.json().catch(() => ({}));
        const message =
          typeof payload.message === 'string'
            ? payload.message
            : typeof payload.error === 'string'
              ? payload.error
              : t('error');
        throw new Error(message);
      }

      const listing = await writerResponse.json();
      setBanner({
        type: 'success',
        message: typeof listing.message === 'string' ? listing.message : t('successLabel'),
        details: typeof listing.text === 'string' ? listing.text : undefined
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error');
      setBanner({
        type: 'error',
        message
      });
    } finally {
      setLoading(false);
    }
  }, [language, parsedFeatures, t, trakheesi, titleHints]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetBanner();

    if (!trakheesi.trim()) {
      setBanner({ type: 'error', message: t('enterTrakheesi') });
      return;
    }

    if (!hasConsent) {
      setBanner({ type: 'error', message: t('consentRequired') });
      return;
    }

    await processSubmission();
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    (window as unknown as { __TEST_TRIGGER?: () => Promise<void> }).__TEST_TRIGGER = async () => {
      resetBanner();
      if (!trakheesi.trim()) {
        setBanner({ type: 'error', message: t('enterTrakheesi') });
        return;
      }
      if (!hasConsent) {
        setBanner({ type: 'error', message: t('consentRequired') });
        return;
      }
      await processSubmission();
    };

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __TEST_TRIGGER?: () => Promise<void> }).__TEST_TRIGGER;
      }
    };
  }, [hasConsent, processSubmission, t, trakheesi]);

  return (
    <main dir={direction} lang={langAttr}>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>

      <form onSubmit={handleSubmit}>
        <div className="consent-toggle">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            checked={hasConsent}
            onChange={handleConsentChange}
            disabled={consentSubmitting || !consentInitialized}
          />
          <label htmlFor="consent">{t('consent')}</label>
        </div>

        {!hasConsent && consentInitialized && (
          <p className="consent-warning" role="status">
            {t('consentRequired')}
          </p>
        )}

        <fieldset disabled={!hasConsent || loading}>
          <label htmlFor="trakheesi">{t('trakheesi')}</label>
          <input
            id="trakheesi"
            name="trakheesi"
            inputMode="numeric"
            pattern="\\d{8}"
            maxLength={8}
            placeholder={t('trakheesiPlaceholder')}
            value={trakheesi}
            onChange={(event) => {
              setTrakheesi(event.target.value);
              resetBanner();
            }}
          />

          <label htmlFor="language">{t('language')}</label>
          <select
            id="language"
            name="language"
            value={language}
            onChange={(event) => {
              const selected = event.target.value as 'en' | 'ar';
              setLanguage(selected);
              resetBanner();
            }}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <label htmlFor="title">{t('titleHint')}</label>
          <input
            id="title"
            name="title"
            placeholder={t('titlePlaceholder')}
            value={titleHints}
            onChange={(event) => setTitleHints(event.target.value)}
          />

          <label htmlFor="features">{t('features')}</label>
          <input
            id="features"
            name="features"
            placeholder={t('featuresPlaceholder')}
            value={features}
            onChange={(event) => setFeatures(event.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? t('checking') : t('submit')}
          </button>
        </fieldset>
      </form>

      {banner && (
        <div className={`banner ${banner.type}`}>
          <strong>{banner.type === 'error' ? t('errorLabel') : t('successLabel')}</strong>
          <div>{banner.message}</div>
          {banner.type === 'success' && banner.details && <p>{banner.details}</p>}
        </div>
      )}
    </main>
  );
}

'use client';

import { FormEvent, useState } from 'react';

type Banner =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string }
  | null;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';

export default function AddListingPage() {
  const [trakheesi, setTrakheesi] = useState('');
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [features, setFeatures] = useState('');
  const [titleHints, setTitleHints] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const resetBanner = () => setBanner(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetBanner();

    if (!trakheesi.trim()) {
      setBanner({ type: 'error', message: 'Enter an 8-digit Trakheesi number.' });
      return;
    }

    setLoading(true);

    try {
      const permitResponse = await fetch(`${API_URL}/permits/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trakheesi_number: trakheesi.trim() })
      });

      if (!permitResponse.ok) {
        throw new Error('Permit check failed.');
      }

      const permit = await permitResponse.json();
      if (permit.status !== 'valid') {
        setBanner({
          type: 'error',
          message: `Permit blocked: status is ${permit.status}.`
        });
        return;
      }

      const writerResponse = await fetch(`${API_URL}/nlp/listing-writer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trakheesi_number: trakheesi.trim(),
          language,
          titleHints: titleHints || undefined,
          features: features
            .split(',')
            .map((feature) => feature.trim())
            .filter(Boolean)
        })
      });

      if (!writerResponse.ok) {
        const payload = await writerResponse.json().catch(() => ({}));
        const message = typeof payload.error === 'string' ? payload.error : 'Listing writer failed.';
        throw new Error(message);
      }

      const listing = await writerResponse.json();
      setBanner({
        type: 'success',
        message: String(listing.text ?? '')
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      setBanner({
        type: 'error',
        message
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Add Listing</h1>
      <p>Validate the Trakheesi permit before generating marketing copy.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="trakheesi">Trakheesi number</label>
        <input
          id="trakheesi"
          name="trakheesi"
          inputMode="numeric"
          pattern="\\d{8}"
          maxLength={8}
          placeholder="00000000"
          value={trakheesi}
          onChange={(event) => {
            setTrakheesi(event.target.value);
            resetBanner();
          }}
        />

        <label htmlFor="language">Language</label>
        <select
          id="language"
          name="language"
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value as 'en' | 'ar');
            resetBanner();
          }}
        >
          <option value="en">English</option>
          <option value="ar">Arabic</option>
        </select>

        <label htmlFor="title">Title hint</label>
        <input
          id="title"
          name="title"
          placeholder="Luxury 2BR in Dubai Marina"
          value={titleHints}
          onChange={(event) => setTitleHints(event.target.value)}
        />

        <label htmlFor="features">Features (comma separated)</label>
        <input
          id="features"
          name="features"
          placeholder="Pool, Sea view"
          value={features}
          onChange={(event) => setFeatures(event.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Validate & Generate'}
        </button>
      </form>

      {banner && (
        <div className={`banner ${banner.type}`}>
          <strong>{banner.type === 'error' ? 'Action required:' : 'Generated copy:'}</strong>
          <div>{banner.message}</div>
        </div>
      )}
    </main>
  );
}

"use client";

import { FormEvent, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@realestate-ai-uae/ui';

interface PermitResponse {
  status: string;
  errors: string[];
  trakheesiNumber: string;
}

export function AddListingForm() {
  const t = useTranslations('listingForm');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<PermitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setError(null);
      setStatus(null);
      const payload = {
        property_id: formData.get('property_id'),
        market: 'Dubai',
        trakheesi_number: formData.get('trakheesi_number')
      };

      const response = await fetch('/api/permits/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.status === 'valid') {
        setStatus(data);
      } else {
        setError(t('errors.invalid'));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor="property_id">
          {t('fields.propertyId')}
        </label>
        <input
          required
          id="property_id"
          name="property_id"
          className="w-full rounded-md border border-slate-200 px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor="trakheesi_number">
          {t('fields.trakheesi')}
        </label>
        <input
          required
          inputMode="numeric"
          pattern="\\d{6}"
          id="trakheesi_number"
          name="trakheesi_number"
          className="w-full rounded-md border border-slate-200 px-3 py-2"
        />
        <p className="text-xs text-slate-500">{t('fields.helper')}</p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? t('submitting') : t('submit')}
      </Button>

      {status && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {t('success')}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </div>
      )}
    </form>
  );
}

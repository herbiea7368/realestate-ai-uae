import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { Button } from '@realestate-ai-uae/ui';

import { MapPlaceholder } from '../../../components/map-placeholder';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <section className="grid gap-6 rounded-3xl bg-white p-8 shadow-sm md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            {t('headline')}
          </h1>
          <p className="text-slate-600">{t('subhead')}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/listing/new">{t('cta.create')}</Link>
            </Button>
            <Button intent="outline" asChild>
              <Link href="/permits/check">{t('cta.validate')}</Link>
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-6 text-center text-brand-700">
            <p className="text-2xl font-bold">{t('compliance.title')}</p>
            <p className="text-sm text-brand-800">{t('compliance.caption')}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{t('sections.listing.title')}</h2>
          <p className="text-slate-600">{t('sections.listing.body')}</p>
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{t('sections.permits.title')}</h2>
          <p className="text-slate-600">{t('sections.permits.body')}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">{t('sections.map.title')}</h2>
        <MapPlaceholder />
      </section>
    </div>
  );
}

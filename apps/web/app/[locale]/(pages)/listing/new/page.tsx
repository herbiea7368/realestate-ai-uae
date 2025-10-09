import { useTranslations } from 'next-intl';

import { AddListingForm } from '@/components/add-listing-form';

export default function NewListingPage() {
  const t = useTranslations('listingForm');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        <p className="text-slate-600">{t('subtitle')}</p>
      </div>
      <AddListingForm />
    </div>
  );
}

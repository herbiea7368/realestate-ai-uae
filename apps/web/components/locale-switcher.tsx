'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { startTransition } from 'react';

import { Button } from '@realestate-ai-uae/ui';
import { locales } from '../i18n';

interface Props {
  currentLocale: string;
}

export function LocaleSwitcher({ currentLocale }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  const otherLocales = locales.filter((loc) => loc !== locale);

  const handleSwitch = (nextLocale: string) => {
    const segments = pathname?.split('/') ?? [];
    segments[1] = nextLocale;
    startTransition(() => {
      router.push(segments.join('/') || '/');
    });
  };

  return (
    <div className="flex items-center gap-2">
      {otherLocales.map((loc) => (
        <Button
          key={loc}
          intent={loc === 'ar' ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => handleSwitch(loc)}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}

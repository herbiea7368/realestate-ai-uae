'use client';

import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../messages/en.json';
import arMessages from '../messages/ar.json';

const messages = {
  en: enMessages,
  ar: arMessages
};

export function IntlProviders({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Dubai">
      {children}
    </NextIntlClientProvider>
  );
}

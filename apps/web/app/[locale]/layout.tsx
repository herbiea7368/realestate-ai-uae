import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { LocaleSwitcher } from '../../components/locale-switcher';
import { locales } from '../../i18n';
import '../globals.css';

export const metadata = {
  title: 'RealEstate AI UAE',
  description: 'Dubai-focused real estate platform with AI-assisted workflows.'
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

async function getMessages(locale: string) {
  try {
    const messages = (await import(../../messages/.json)).default;
    return messages;
  } catch (error) {
    notFound();
  }
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages(locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="bg-slate-50">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-30">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <span className="text-lg font-semibold text-brand-700">
                  RealEstate AI UAE
                </span>
                <LocaleSwitcher currentLocale={locale} />
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-white/80">
              <div className="mx-auto max-w-5xl px-6 py-4 text-sm text-slate-500">
                © {new Date().getFullYear()} RERA compliant automation.
              </div>
            </footer>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

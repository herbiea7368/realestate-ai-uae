import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en';

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const activeLocale = locale ?? defaultLocale;
  return {
    locale: activeLocale,
    messages: (await import(`./messages/${activeLocale}.json`)).default
  };
});

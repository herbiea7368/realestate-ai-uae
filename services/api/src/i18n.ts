import i18next from 'i18next';

export type SupportedLang = 'en' | 'ar';

const resources = {
  en: {
    translation: {
      permits: {
        valid: 'Permit verified and active.',
        invalid: 'Permit Invalid or Expired',
        expired: 'Permit expired.'
      },
      listing: {
        success: 'Listing copy generated successfully.',
        invalidPermit: 'Permit must be valid before generating copy.',
        error: 'Unable to generate listing.',
        defaultHeadline: 'New listing',
        noFeatures: 'No highlighted features',
        summary: 'Permit {{trakheesi}}: {{headline}}. Features: {{features}}.'
      }
    }
  },
  ar: {
    translation: {
      permits: {
        valid: 'تم التحقق من التصريح وهو ساري.',
        invalid: 'الترخيص غير صالح أو منتهي',
        expired: 'انتهت صلاحية الترخيص.'
      },
      listing: {
        success: 'تم إنشاء وصف الإعلان بنجاح.',
        invalidPermit: 'يجب أن يكون الترخيص صالحاً قبل إنشاء الوصف.',
        error: 'تعذر إنشاء الإعلان.',
        defaultHeadline: 'إعلان جديد',
        noFeatures: 'لا توجد مزايا مميزة',
        summary: 'تصريح {{trakheesi}}: {{headline}}. المزايا: {{features}}.'
      }
    }
  }
} satisfies Record<SupportedLang, { translation: Record<string, unknown> }>;

const i18n = i18next.createInstance();

void i18n.init({
  fallbackLng: 'en',
  initImmediate: false,
  interpolation: { escapeValue: false },
  resources
});

export function resolveLanguage(input: unknown): SupportedLang {
  return input === 'ar' ? 'ar' : 'en';
}

export function translate(lang: SupportedLang, key: string, options?: Record<string, unknown>): string {
  return i18n.getFixedT(lang)(key, options);
}

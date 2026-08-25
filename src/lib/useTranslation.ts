import { useCallback, useMemo } from 'react';
import translations, { TranslationKey } from './translations';
import { Language } from '../types';

/**
 * Maps the app Language code to the translation file key.
 * For languages not yet in translations, falls back to English.
 */
function mapLanguageToTranslationKey(lang: Language): string {
  const mapping: Record<string, string> = {
    hi: 'hi',
    en: 'en',
    hinglish: 'hinglish',
    mr: 'mr',
    bn: 'bn',
    ta: 'ta',
    te: 'te',
    gu: 'gu',
    kn: 'kn',
    ml: 'ml',
    pa: 'pa',
    or: 'or',
    ur: 'ur',
  };
  return mapping[lang] || 'en';
}

interface UseTranslationReturn {
  t: (key: TranslationKey) => string;
  language: Language;
  isRTL: boolean;
}

export function useTranslation(language: Language): UseTranslationReturn {
  const translationKey = useMemo(() => mapLanguageToTranslationKey(language), [language]);
  const isRTL = language === 'ur';

  const t = useCallback(
    (key: TranslationKey): string => {
      const langBundle = translations[translationKey] || translations.en;
      const value = langBundle[key];
      if (value !== undefined) return value;
      // Fallback to English
      const enValue = translations.en[key];
      if (enValue !== undefined) return enValue;
      // Last resort: return the key itself
      return key;
    },
    [translationKey]
  );

  return { t, language, isRTL };
}

export default useTranslation;

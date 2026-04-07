import { useCallback, useEffect, useState } from 'react';
import {
  getI18nLocale,
  i18n,
  subscribeToI18nLocale,
} from './i18nInstance';

export function useTranslation() {
  const [locale, setLocale] = useState(getI18nLocale());

  useEffect(() => {
    const unsubscribe = subscribeToI18nLocale((nextLocale) => {
      setLocale(nextLocale);
    });

    return unsubscribe;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, any>) => {
      return i18n.t(key, {
        ...(params ?? {}),
        locale,
      });
    },
    [locale]
  );

  return { t, locale };
}
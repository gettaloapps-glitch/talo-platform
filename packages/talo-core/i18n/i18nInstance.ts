import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import en from './en.json';
import es from './es.json';
import pt from './pt.json';

const SUPPORTED_LOCALES = ['en', 'es', 'pt'] as const;
const DEFAULT_LOCALE = 'en';

const i18n = new I18n({
  en,
  es,
  pt,
});

const deviceLanguage =
  Localization.getLocales()?.[0]?.languageCode?.toLowerCase() ?? DEFAULT_LOCALE;

i18n.enableFallback = true;
i18n.defaultLocale = DEFAULT_LOCALE;
i18n.locale = SUPPORTED_LOCALES.includes(
  deviceLanguage as (typeof SUPPORTED_LOCALES)[number]
)
  ? deviceLanguage
  : DEFAULT_LOCALE;

type LocaleListener = (locale: string) => void;

const listeners = new Set<LocaleListener>();

export { i18n };

export function getI18nLocale() {
  return i18n.locale;
}

export function subscribeToI18nLocale(listener: LocaleListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setI18nLocale(locale: string) {
  const nextLocale = SUPPORTED_LOCALES.includes(
    locale as (typeof SUPPORTED_LOCALES)[number]
  )
    ? locale
    : DEFAULT_LOCALE;

  i18n.locale = nextLocale;

  listeners.forEach((listener) => {
    listener(nextLocale);
  });
}
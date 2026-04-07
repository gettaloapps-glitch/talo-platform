import * as Localization from 'expo-localization';
import type { AppLanguage, CurrencyCode } from '@talo/core';

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  AR: 'ARS',
  BR: 'BRL',
  MX: 'MXN',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  US: 'USD',
  GB: 'GBP',
  ES: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  PT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  IE: 'EUR',
};

const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'es', 'pt'];

function getPrimaryLocale() {
  return Localization.getLocales()?.[0];
}

export function detectDeviceCurrency(): CurrencyCode {
  const locale = getPrimaryLocale();
  const regionCode = locale?.regionCode?.toUpperCase();

  if (!regionCode) {
    return 'USD';
  }

  return COUNTRY_TO_CURRENCY[regionCode] ?? 'USD';
}

export function detectDeviceLanguage(): AppLanguage {
  const locale = getPrimaryLocale();
  const languageCode = locale?.languageCode?.toLowerCase();

  if (!languageCode) {
    return 'en';
  }

  return SUPPORTED_LANGUAGES.includes(languageCode as AppLanguage)
    ? (languageCode as AppLanguage)
    : 'en';
}
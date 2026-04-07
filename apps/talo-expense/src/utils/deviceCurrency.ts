import * as Localization from 'expo-localization';
import type { CurrencyCode } from '@talo/core';

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

export function detectDeviceCurrency(): CurrencyCode {
  const regionCode = Localization.getLocales()?.[0]?.regionCode?.toUpperCase();

  if (!regionCode) {
    return 'USD';
  }

  return COUNTRY_TO_CURRENCY[regionCode] ?? 'USD';
}
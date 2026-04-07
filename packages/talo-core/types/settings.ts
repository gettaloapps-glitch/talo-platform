import type { CurrencyCode } from './currency';

export type AppLanguage = 'en' | 'es' | 'pt';

export type AppSettings = {
  currency: CurrencyCode;
  language: AppLanguage;
};
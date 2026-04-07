import type { CurrencyCode } from '@talo/core';

export type CurrencyOption = {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', label: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', label: 'British Pound', flag: '🇬🇧' },
  { code: 'ARS', symbol: '$', label: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', symbol: '$', label: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'CLP', symbol: '$', label: 'Chilean Peso', flag: '🇨🇱' },
  { code: 'COP', symbol: '$', label: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'PEN', symbol: 'S/', label: 'Peruvian Sol', flag: '🇵🇪' },
];

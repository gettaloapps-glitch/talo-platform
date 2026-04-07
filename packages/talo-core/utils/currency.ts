import type { CurrencyCode } from '../types/currency';

const CURRENCY_TO_LOCALE: Record<CurrencyCode, string> = {
  USD: 'en-US',
  EUR: 'es-ES',
  GBP: 'en-GB',
  ARS: 'es-AR',
  BRL: 'pt-BR',
  MXN: 'es-MX',
  CLP: 'es-CL',
  COP: 'es-CO',
  PEN: 'es-PE',
};

function getLocale(currency: CurrencyCode): string {
  return CURRENCY_TO_LOCALE[currency] ?? 'en-US';
}

function getCurrencyPrefix(currency: CurrencyCode): string {
  switch (currency) {
    case 'BRL':
      return 'R$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'PEN':
      return 'S/';
    default:
      return '$';
  }
}

function usesZeroDecimals(currency: CurrencyCode): boolean {
  return currency === 'CLP' || currency === 'COP';
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode
): string {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(getLocale(currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: usesZeroDecimals(currency) ? 0 : 2,
    maximumFractionDigits: usesZeroDecimals(currency) ? 0 : 2,
  }).format(safeValue);
}

export function formatCompactCurrency(
  value: number,
  currency: CurrencyCode
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const absValue = Math.abs(safeValue);

  if (absValue >= 1000000) {
    return `${getCurrencyPrefix(currency)} ${(safeValue / 1000000).toFixed(2)}M`;
  }

  if (absValue >= 1000) {
    return `${getCurrencyPrefix(currency)} ${(safeValue / 1000).toFixed(1)}K`;
  }

  return formatCurrency(safeValue, currency);
}
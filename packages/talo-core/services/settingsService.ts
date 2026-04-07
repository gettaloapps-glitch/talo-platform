import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage, AppSettings } from '../types/settings';
import type { CurrencyCode } from '../types/currency';
import { setI18nLocale } from '../i18n/i18nInstance';


const SETTINGS_STORAGE_KEY = 'talo.settings';

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  language: 'en',
};

export async function getSettings(
  defaults?: Partial<AppSettings>
): Promise<AppSettings> {
  const fallback: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...defaults,
  };

  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return {
      currency: parsed.currency ?? fallback.currency,
      language: parsed.language ?? fallback.language,
    };
  } catch {
    return fallback;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export async function updateCurrency(
  currency: CurrencyCode
): Promise<AppSettings> {
  const current = await getSettings();

  const next: AppSettings = {
    ...current,
    currency,
  };

  await saveSettings(next);
  return next;
}

export async function updateLanguage(
  language: AppLanguage
): Promise<AppSettings> {
  const current = await getSettings();

  const next: AppSettings = {
    ...current,
    language,
  };

  await saveSettings(next);
  setI18nLocale(language);

  return next;
}

export async function resetSettings(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
}

export { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY };
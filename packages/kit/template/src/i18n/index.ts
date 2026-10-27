import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { PREFERENCES_STORAGE_KEY } from '../constants/storage';
import { en } from './locales/en';
import { zhCN } from './locales/zh-CN';

export const supportedLanguages = ['zh-CN', 'en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

function normalizeLanguageTag(languageTag?: string | null): SupportedLanguage {
  if (languageTag?.toLowerCase().startsWith('en')) {
    return 'en';
  }

  return 'zh-CN';
}

export const defaultLanguage = normalizeLanguageTag(Localization.getLocales()[0]?.languageTag);
const i18nInstance = i18n;
const PERSISTED_LANGUAGE_PATH = ['state', 'language'];

if (!i18nInstance.isInitialized) {
  i18nInstance.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    lng: defaultLanguage,
    fallbackLng: 'zh-CN',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      'zh-CN': {
        translation: zhCN,
      },
      en: {
        translation: en,
      },
    },
    returnNull: false,
  });
}

/** Restore the persisted language before the route tree renders. */
export async function initializeI18n() {
  const persistedLanguage = await readPersistedLanguage();
  const nextLanguage = persistedLanguage ?? defaultLanguage;

  if (i18nInstance.language !== nextLanguage) {
    await i18nInstance.changeLanguage(nextLanguage);
  }

  return i18nInstance;
}

async function readPersistedLanguage(): Promise<SupportedLanguage | null> {
  const rawValue = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      state?: {
        language?: string;
      };
    };
    const persistedLanguage = PERSISTED_LANGUAGE_PATH.reduce<unknown>(
      (currentValue, key) =>
        currentValue && typeof currentValue === 'object'
          ? (currentValue as Record<string, unknown>)[key]
          : undefined,
      parsed
    );

    return normalizeLanguageTag(typeof persistedLanguage === 'string' ? persistedLanguage : null);
  } catch {
    return null;
  }
}

export default i18n;

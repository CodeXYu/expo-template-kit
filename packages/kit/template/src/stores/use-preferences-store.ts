import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { type ThemeName } from 'expo-template-kit';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { PREFERENCES_STORAGE_KEY } from '../constants/storage';
import i18n, { type SupportedLanguage } from '../i18n';

export type PreferencesState = {
  language: SupportedLanguage;
  theme: ThemeName | null;
  hasHydrated: boolean;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: (currentTheme: ThemeName) => void;
  useSystemTheme: () => void;
};

const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const preferencesStorage = createJSONStorage(() =>
  Platform.OS === 'web' && typeof window === 'undefined' ? serverStorage : AsyncStorage
);

/** Project-owned persisted preferences can be extended alongside product needs. */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    set => ({
      language: i18n.language === 'en' ? 'en' : 'zh-CN',
      theme: null,
      hasHydrated: false,
      setLanguage: async language => {
        await i18n.changeLanguage(language);
        set({ language });
      },
      setTheme: theme => set({ theme }),
      toggleTheme: currentTheme => set({ theme: currentTheme === 'dark' ? 'light' : 'dark' }),
      useSystemTheme: () => set({ theme: null }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: preferencesStorage,
      partialize: state => ({
        language: state.language,
        theme: state.theme,
      }),
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hasHydrated: true });
      },
    }
  )
);

export function waitForPreferencesHydration() {
  if (usePreferencesStore.persist.hasHydrated()) {
    return Promise.resolve();
  }

  return new Promise<void>(resolve => {
    const unsubscribe = usePreferencesStore.subscribe(state => {
      if (!state.hasHydrated) {
        return;
      }

      unsubscribe();
      resolve();
    });
  });
}

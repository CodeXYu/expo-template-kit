import AsyncStorage from '@react-native-async-storage/async-storage';
import { Backstage } from 'rn-backstage';

import { isBackstageEnabled } from '@/config/environment';

import { usePreferencesStore } from '../stores/use-preferences-store';

/** Project environment configuration controls development diagnostics explicitly. */
export function DevelopmentBackstage() {
  const preferences = usePreferencesStore();

  if (!isBackstageEnabled) {
    return null;
  }

  return (
    <Backstage
      state={{ preferences }}
      storageAdapter={{
        getAllKeys: async () => [...(await AsyncStorage.getAllKeys())],
        getItem: key => AsyncStorage.getItem(key),
        setItem: (key, value) => AsyncStorage.setItem(key, value),
        removeItem: key => AsyncStorage.removeItem(key),
      }}
    />
  );
}

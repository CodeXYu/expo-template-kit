import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from 'expo-template-kit';

import { getHomePageCopyKeys } from './index.api';
import type { HomePageViewModel } from './index.type';

/** Prepares localized, presentation-ready data for the starter Home page. */
export function useHomePageLogic(): HomePageViewModel {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const copyKeys = getHomePageCopyKeys();

  return {
    description: t(copyKeys.description),
    offlineHint: t(copyKeys.offline_hint),
    showOfflineHint: isOffline,
    title: t(copyKeys.title),
  };
}

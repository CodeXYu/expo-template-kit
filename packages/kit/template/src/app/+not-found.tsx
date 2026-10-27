import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppErrorView } from '../components/app-error-view';

/** Fallback route for paths that do not exist in the generated application. */
export default function NotFoundRoute() {
  const { t } = useTranslation();

  return (
    <AppErrorView
      action={{
        accessibilityHint: t('template.not_found_home_hint'),
        label: t('template.not_found_home'),
        onPress: () => router.replace('/'),
      }}
      description={t('template.not_found_description')}
      title={t('template.not_found_title')}
    />
  );
}

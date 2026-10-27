import { useTranslation } from 'react-i18next';

import { AppErrorView } from '../app-error-view';

type AppStartupErrorViewProps = {
  isRetrying: boolean;
  onRetry: () => void;
};

/** Adds startup-specific copy and retry state to the shared recovery view. */
export function AppStartupErrorView({ isRetrying, onRetry }: AppStartupErrorViewProps) {
  const { t } = useTranslation();

  return (
    <AppErrorView
      action={{
        accessibilityHint: t('template.startup_retry_hint'),
        label: t('common.retry'),
        loading: isRetrying,
        onPress: onRetry,
      }}
      description={t('template.startup_error_description')}
      title={t('template.startup_error_title')}
    />
  );
}

import { Stack, useNavigationContainerRef, type ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import { captureException, logger, useAppReady } from 'expo-template-kit';

import { isLoggerEnabled, sentryDsn } from '@/config/environment';
import { registerSentryNavigation } from '@/config/sentry';

import '../config/reactotron';
import { initializeApp } from '../lib/initialize-app';
import { AppProviders } from '../providers/app-providers';
import { AppErrorView } from '../components/app-error-view';
import { AppStartupErrorView } from '../components/app-startup-error-view';

logger.setConfig({ enabled: isLoggerEnabled });

function RootLayout() {
  const navigationRef = useNavigationContainerRef();
  const { error, isInitializing, isReady, retry } = useAppReady(initializeApp);

  useEffect(() => {
    registerSentryNavigation(navigationRef);
  }, [navigationRef]);

  useEffect(() => {
    if (error) {
      captureException(error, { layer: 'app-startup' });
    }
  }, [error]);

  return (
    <AppProviders>
      {isReady ? <Stack screenOptions={{ headerShown: false }} /> : null}
      {error ? (
        <AppStartupErrorView isRetrying={isInitializing} onRetry={() => void retry()} />
      ) : null}
    </AppProviders>
  );
}

/** Catches errors thrown by route descendants and offers a route-level retry. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  useEffect(() => {
    captureException(error, { layer: 'route' });
  }, [error]);

  return (
    <AppProviders>
      <AppErrorView
        action={{
          accessibilityHint: t('template.route_error_retry_hint'),
          label: t('common.retry'),
          onPress: () => void retry(),
        }}
        description={t('template.route_error_description')}
        title={t('template.route_error_title')}
      />
    </AppProviders>
  );
}

// Sentry must be initialized before its app-start instrumentation is mounted.
export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;

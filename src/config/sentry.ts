import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { initErrorReporting, type ErrorReporter } from 'expo-template-kit';

import { isDev, sentryDsn, sentryEnvironment, sentryTracesSampleRate } from './environment';

const navigationIntegration = sentryDsn
  ? Sentry.reactNavigationIntegration({
      enableTimeToInitialDisplay: !isRunningInExpoGo() && sentryTracesSampleRate > 0,
    })
  : undefined;

const sentryReporter: ErrorReporter = {
  init: () => {
    if (!sentryDsn) {
      return;
    }

    Sentry.init({
      dsn: sentryDsn,
      debug: isDev,
      enableAutoSessionTracking: true,
      enableNativeFramesTracking: !isRunningInExpoGo() && sentryTracesSampleRate > 0,
      environment: sentryEnvironment,
      integrations: navigationIntegration ? [navigationIntegration] : [],
      sendDefaultPii: false,
      tracesSampleRate: sentryTracesSampleRate,
    });
  },
  captureException: (error, context) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  },
  captureMessage: (message, context) => {
    Sentry.captureMessage(message, { extra: context, level: 'warning' });
  },
};

// Install the project-reported monitoring adapter before React renders so
// request and React Query failures during startup are captured.
if (sentryDsn) {
  initErrorReporting(sentryReporter);
}

/**
 * Registers Expo Router's navigation container with Sentry.
 * Register the same integration used by initialization so navigation spans
 * remain associated with the project-owned monitoring configuration.
 */
export function registerSentryNavigation(navigationRef: unknown) {
  navigationIntegration?.registerNavigationContainer(navigationRef);
}

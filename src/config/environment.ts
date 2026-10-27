export type AppEnvironment = 'development' | 'int' | 'production';

const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV;

export const appEnvironment: AppEnvironment =
  configuredEnvironment === 'development' ||
  configuredEnvironment === 'int' ||
  configuredEnvironment === 'production'
    ? configuredEnvironment
    : __DEV__
      ? 'development'
      : 'production';

function readPublicBoolean(value: string | undefined, fallback: boolean) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function readPublicRate(value: string | undefined, fallback: number) {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

export const isDev = appEnvironment === 'development';
export const isInt = appEnvironment === 'int';
export const isProd = appEnvironment === 'production';

export const isLoggerEnabled = readPublicBoolean(process.env.EXPO_PUBLIC_ENABLE_LOGGER, isDev);
export const isBackstageEnabled = readPublicBoolean(
  process.env.EXPO_PUBLIC_ENABLE_BACKSTAGE,
  __DEV__
);

export const reactotronHost = process.env.EXPO_PUBLIC_REACTOTRON_HOST?.trim() || undefined;
export const apiBaseURL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || '';

// The DSN is a public ingest identifier. Build credentials such as
// SENTRY_AUTH_TOKEN must never use an EXPO_PUBLIC_ prefix.
export const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || undefined;
export const isSentryEnabled = Boolean(sentryDsn);
export const sentryEnvironment =
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() || appEnvironment;
// Error monitoring works with 0. Raise this only after reviewing event volume.
export const sentryTracesSampleRate = readPublicRate(
  process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  isDev ? 1 : 0
);

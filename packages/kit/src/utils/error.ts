import { BusinessError, CancelError, RequestError, TimeoutError } from './request';

export type AppErrorKind = 'network' | 'timeout' | 'cancel' | 'http' | 'business' | 'unknown';

export type ErrorMessageKey =
  | 'errors.network'
  | 'errors.timeout'
  | 'errors.cancelled'
  | 'errors.unauthorized'
  | 'errors.forbidden'
  | 'errors.not_found'
  | 'errors.rate_limited'
  | 'errors.server'
  | 'errors.request'
  | 'errors.business'
  | 'errors.unknown';

export interface NormalizedError {
  kind: AppErrorKind;
  code?: string;
  status?: number;
  /** Technical message for logs and monitoring. Do not render it directly. */
  message: string;
  /** Localization key used by the app UI. */
  userMessageKey: ErrorMessageKey;
  retryable: boolean;
  /** Server-provided business message, only used when explicitly requested. */
  serverMessage?: string;
}

export type ErrorTranslator = (key: ErrorMessageKey) => string;

export interface GetErrorMessageOptions {
  /**
   * Business APIs sometimes return user-facing copy. Opt in explicitly instead
   * of exposing raw transport or server messages by default.
   */
  preferServerMessage?: boolean;
}

const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

function getErrorMessageText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return fallback;
}

function isRetryableStatus(status: number) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}

function getHttpMessageKey(status: number): ErrorMessageKey {
  switch (status) {
    case 401:
      return 'errors.unauthorized';
    case 403:
      return 'errors.forbidden';
    case 404:
      return 'errors.not_found';
    case 408:
      return 'errors.timeout';
    case 429:
      return 'errors.rate_limited';
    default:
      return status >= 500 ? 'errors.server' : 'errors.request';
  }
}

/**
 * Converts every supported request/runtime error into one stable UI contract.
 * Keep raw error messages out of the UI; use `userMessageKey` instead.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof CancelError) {
    return {
      kind: 'cancel',
      status: error.meta.status,
      message: getErrorMessageText(error, 'Request cancelled'),
      userMessageKey: 'errors.cancelled',
      retryable: false,
    };
  }

  if (error instanceof TimeoutError) {
    return {
      kind: 'timeout',
      status: error.status,
      message: getErrorMessageText(error, 'Request timed out'),
      userMessageKey: 'errors.timeout',
      retryable: true,
    };
  }

  if (error instanceof BusinessError) {
    return {
      kind: 'business',
      code: error.code,
      status: error.meta.status,
      message: getErrorMessageText(error, 'Business request failed'),
      serverMessage: error.message || undefined,
      userMessageKey: 'errors.business',
      retryable: false,
    };
  }

  if (error instanceof RequestError) {
    const status = error.status;
    return {
      kind: status === 0 ? 'network' : 'http',
      status,
      message: getErrorMessageText(error, 'Request failed'),
      userMessageKey: status === 0 ? 'errors.network' : getHttpMessageKey(status),
      retryable: isRetryableStatus(status),
    };
  }

  return {
    kind: 'unknown',
    message: getErrorMessageText(error, UNKNOWN_ERROR_MESSAGE),
    userMessageKey: 'errors.unknown',
    retryable: false,
  };
}

/**
 * Resolves localized UI copy for an error. Raw technical messages are only
 * returned for business errors when the caller explicitly opts in.
 */
export function getErrorMessage(
  error: unknown,
  t: ErrorTranslator,
  options: GetErrorMessageOptions = {}
) {
  const normalized = normalizeError(error);

  if (options.preferServerMessage && normalized.serverMessage) {
    return normalized.serverMessage;
  }

  return t(normalized.userMessageKey);
}

export function isRetryable(error: unknown) {
  return normalizeError(error).retryable;
}

/** Auth-related HTTP failures should be handled by the app's auth flow, not retried. */
export function isAuthError(error: unknown) {
  const { status } = normalizeError(error);
  return status === 401 || status === 403;
}

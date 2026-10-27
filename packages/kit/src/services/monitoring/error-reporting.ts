import { logger } from '../../utils/logger';

export type ErrorReportingContext = Record<string, unknown> | undefined;

/**
 * Product-owned monitoring adapter. The shared package keeps this boundary
 * small so Sentry, Bugsnag, or another SDK can be initialized by the
 * generated project without adding that SDK to the shared package.
 */
export interface ErrorReporter {
  init: () => void;
  captureException: (error: unknown, context?: ErrorReportingContext) => void;
  captureMessage: (message: string, context?: ErrorReportingContext) => void;
}

const reportingLogger = logger.create('error-reporting');

const loggerReporter: ErrorReporter = {
  init: () => {
    reportingLogger.info('Using the default logger error reporter');
  },
  captureException: (error, context) => {
    reportingLogger.error('Captured exception', error, context);
  },
  captureMessage: (message, context) => {
    reportingLogger.warn('Captured message', message, context);
  },
};

let reporter: ErrorReporter = loggerReporter;
let hasInitialized = false;

/**
 * Initializes the shared error-reporting boundary.
 *
 * Call once during app startup with the project-owned reporter. Later calls
 * without an argument are no-ops, so the default provider effect can safely
 * run after a project has already installed a real monitoring SDK.
 */
export function initErrorReporting(nextReporter?: ErrorReporter) {
  if (nextReporter && nextReporter !== reporter) {
    reporter = nextReporter;
    hasInitialized = false;
  }

  if (hasInitialized) {
    return;
  }

  hasInitialized = true;

  try {
    reporter.init();
  } catch (error) {
    reportingLogger.error('Failed to initialize error reporter; using logger', error);
    reporter = loggerReporter;
    reporter.init();
  }
}

export function captureException(error: unknown, context?: ErrorReportingContext) {
  try {
    reporter.captureException(error, context);
  } catch (reportingError) {
    reportingLogger.error('Failed to capture exception', reportingError);
  }
}

export function captureMessage(message: string, context?: ErrorReportingContext) {
  try {
    reporter.captureMessage(message, context);
  } catch (reportingError) {
    reportingLogger.error('Failed to capture message', reportingError);
  }
}

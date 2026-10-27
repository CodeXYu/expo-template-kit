import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

function loadTypeScriptModule(filePath, requireModule) {
  const source = readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const context = {
    console,
    exports: module.exports,
    module,
    require: requireModule,
  };

  vm.runInNewContext(output, context, { filename: filePath });
  return module.exports;
}

function loadErrorModel() {
  const request = loadTypeScriptModule(join(process.cwd(), 'src/utils/request.ts'), name => {
    if (name === '../services/monitoring/error-reporting') {
      return { captureException: () => {} };
    }
    if (name === './logger') {
      const logger = {
        create: () => logger,
        debug: () => {},
        error: () => {},
        info: () => {},
        log: () => {},
        warn: () => {},
      };
      return { logger };
    }
    throw new Error(`Unexpected request dependency: ${name}`);
  });
  const errors = loadTypeScriptModule(join(process.cwd(), 'src/utils/error.ts'), name => {
    if (name === './request') {
      return request;
    }
    throw new Error(`Unexpected error-model dependency: ${name}`);
  });

  return { errors, request };
}

function loadQueryClient() {
  const { errors, request } = loadErrorModel();
  class QueryCache {
    constructor(options) {
      this.options = options;
    }
  }
  class MutationCache {
    constructor(options) {
      this.options = options;
    }
  }
  class QueryClient {
    constructor(config) {
      this.config = config;
    }

    getDefaultOptions() {
      return this.config.defaultOptions;
    }
  }

  const queryClient = loadTypeScriptModule(join(process.cwd(), 'src/lib/query-client.ts'), name => {
    if (name === '@tanstack/react-query') {
      return { MutationCache, QueryCache, QueryClient };
    }
    if (name === '../services/monitoring/error-reporting') {
      return { captureException: () => {} };
    }
    if (name === '../utils/error') {
      return errors;
    }
    if (name === '../utils/request') {
      return request;
    }
    throw new Error(`Unexpected query-client dependency: ${name}`);
  });

  return { queryClient, request };
}

const meta = { url: '/api/test', method: 'GET' };
const t = key => `translated:${key}`;

test('normalizes request, business, cancel, timeout, and unknown errors', () => {
  const { errors, request } = loadErrorModel();
  const httpError = new request.RequestError('server failed', 500, null, {
    ...meta,
    status: 500,
  });
  const networkError = new request.RequestError('network failed', 0, null, {
    ...meta,
    status: 0,
  });
  const timeoutError = new request.TimeoutError(1000, meta);
  const cancelError = new request.CancelError('user aborted', meta);
  const businessError = new request.BusinessError(
    'invalid coupon',
    'INVALID_COUPON',
    { code: 'INVALID_COUPON', msg: 'invalid coupon' },
    { ...meta, status: 200 }
  );

  assert.deepEqual(
    {
      kind: errors.normalizeError(httpError).kind,
      status: errors.normalizeError(httpError).status,
      userMessageKey: errors.normalizeError(httpError).userMessageKey,
      retryable: errors.normalizeError(httpError).retryable,
    },
    {
      kind: 'http',
      status: 500,
      userMessageKey: 'errors.server',
      retryable: true,
    }
  );
  assert.equal(errors.normalizeError(networkError).kind, 'network');
  assert.equal(errors.normalizeError(networkError).userMessageKey, 'errors.network');
  assert.equal(errors.normalizeError(timeoutError).kind, 'timeout');
  assert.equal(errors.normalizeError(timeoutError).userMessageKey, 'errors.timeout');
  assert.equal(errors.normalizeError(cancelError).kind, 'cancel');
  assert.equal(errors.normalizeError(cancelError).userMessageKey, 'errors.cancelled');
  assert.equal(errors.normalizeError(businessError).kind, 'business');
  assert.equal(errors.normalizeError(businessError).code, 'INVALID_COUPON');
  assert.equal(errors.normalizeError(new Error('boom')).kind, 'unknown');
  assert.equal(errors.normalizeError(undefined).message, 'Unknown error');
});

test('maps HTTP statuses to localized message keys', () => {
  const { errors, request } = loadErrorModel();

  for (const [status, expectedKey] of [
    [400, 'errors.request'],
    [401, 'errors.unauthorized'],
    [403, 'errors.forbidden'],
    [404, 'errors.not_found'],
    [408, 'errors.timeout'],
    [429, 'errors.rate_limited'],
    [500, 'errors.server'],
    [503, 'errors.server'],
  ]) {
    const error = new request.RequestError('http failed', status, null, {
      ...meta,
      status,
    });
    assert.equal(errors.normalizeError(error).userMessageKey, expectedKey);
  }
});

test('only retries transient errors and identifies auth failures', () => {
  const { errors, request } = loadErrorModel();
  const requestError = status =>
    new request.RequestError('request failed', status, null, { ...meta, status });

  assert.equal(errors.isRetryable(requestError(0)), true);
  assert.equal(errors.isRetryable(requestError(408)), true);
  assert.equal(errors.isRetryable(requestError(429)), true);
  assert.equal(errors.isRetryable(requestError(500)), true);
  assert.equal(errors.isRetryable(requestError(503)), true);
  assert.equal(errors.isRetryable(requestError(401)), false);
  assert.equal(errors.isRetryable(requestError(403)), false);
  assert.equal(errors.isRetryable(requestError(404)), false);
  assert.equal(errors.isRetryable(new request.TimeoutError(1000, meta)), true);
  assert.equal(
    errors.isRetryable(
      new request.BusinessError('failed', 'BUSINESS_FAILED', undefined, {
        ...meta,
        status: 200,
      })
    ),
    false
  );
  assert.equal(errors.isRetryable(new Error('boom')), false);
  assert.equal(errors.isRetryable(new request.CancelError('cancel', meta)), false);

  assert.equal(errors.isAuthError(requestError(401)), true);
  assert.equal(errors.isAuthError(requestError(403)), true);
  assert.equal(errors.isAuthError(requestError(500)), false);
});

test('uses localized copy unless server business copy is explicitly requested', () => {
  const { errors, request } = loadErrorModel();
  const businessError = new request.BusinessError(
    'invalid coupon',
    'INVALID_COUPON',
    { code: 'INVALID_COUPON', msg: 'invalid coupon' },
    { ...meta, status: 200 }
  );

  assert.equal(errors.getErrorMessage(businessError, t), 'translated:errors.business');
  assert.equal(
    errors.getErrorMessage(businessError, t, { preferServerMessage: true }),
    'invalid coupon'
  );
  assert.equal(
    errors.getErrorMessage(new Error('technical message'), t),
    'translated:errors.unknown'
  );
});

test('uses the shared retry predicate in the default query client', () => {
  const { queryClient, request } = loadQueryClient();
  const defaults = queryClient.createDefaultQueryClient().getDefaultOptions();
  const retry = defaults.queries.retry;
  const requestError = status =>
    new request.RequestError('request failed', status, null, { ...meta, status });

  assert.equal(retry(0, requestError(500)), true);
  assert.equal(retry(1, requestError(500)), false);
  assert.equal(retry(0, requestError(401)), false);
  assert.equal(retry(0, requestError(404)), false);
  assert.equal(retry(0, new Error('unexpected')), false);
  assert.equal(defaults.mutations.retry, 0);
});

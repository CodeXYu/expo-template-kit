import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadRequest(fetchImpl) {
  const source = readFileSync(join(process.cwd(), 'src/utils/request.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const captures = [];
  const logs = [];
  const logger = {
    info: (...args) => logs.push(['info', ...args]),
    error: (...args) => logs.push(['error', ...args]),
  };

  vm.runInNewContext(output, {
    AbortController,
    ArrayBuffer,
    Blob,
    FormData,
    Headers,
    URL,
    URLSearchParams,
    clearTimeout,
    console,
    exports: module.exports,
    fetch: fetchImpl,
    module,
    require: specifier => {
      if (specifier === '../services/monitoring/error-reporting') {
        return {
          captureException: (error, context) => captures.push({ error, context }),
        };
      }
      if (specifier === './logger') {
        return { logger };
      }
      throw new Error(`Unexpected module: ${specifier}`);
    },
    setTimeout,
  });

  return { ...module.exports, captures, logs };
}

function jsonResponse(payload, { ok = true, status = 200, statusText = 'OK' } = {}) {
  return {
    ok,
    status,
    statusText,
    text: async () => JSON.stringify(payload),
  };
}

function abortError() {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

test('preserves baseURL paths, query parameters, and absolute URLs', async () => {
  const calls = [];
  const { createRequestClient } = loadRequest(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse({ ok: true });
  });
  const client = createRequestClient({ baseURL: 'https://api.example.com/v1' });

  await client.get('/profiles', {
    params: { active: true, tag: ['a', 'b'], empty: null },
  });
  await client.get('https://status.example.com/health');

  assert.equal(calls[0].url, 'https://api.example.com/v1/profiles?active=true&tag=a&tag=b&empty=');
  assert.equal(calls[1].url, 'https://status.example.com/health');
});

test('uses business parsing only when the project configures a success code', async () => {
  let callCount = 0;
  const { createRequestClient, RequestError } = loadRequest(async () => {
    callCount += 1;
    return callCount < 3
      ? jsonResponse({ code: 'US', name: 'United States' })
      : jsonResponse({ name: 'United States' });
  });
  const genericClient = createRequestClient({ baseURL: 'https://api.example.com' });
  const businessClient = createRequestClient({
    baseURL: 'https://api.example.com',
    successCode: '10000',
  });

  const country = await genericClient.get('/country');
  assert.equal(country.code, 'US');
  assert.equal(country.name, 'United States');
  const wrappedCountry = await genericClient.get('/country', {
    unwrapData: false,
  });
  assert.equal(wrappedCountry.code, 'US');
  await assert.rejects(
    businessClient.get('/country', { unwrapData: false }),
    error => error instanceof RequestError
  );
});

test('unwraps configured business responses and reports their failures once', async () => {
  let callCount = 0;
  const { createRequestClient, BusinessError, captures } = loadRequest(async () => {
    callCount += 1;
    return callCount === 1
      ? jsonResponse({ code: '10000', data: { id: 'profile-1' } })
      : callCount === 2
        ? jsonResponse({ code: '10000', data: { id: 'profile-2' } })
        : jsonResponse({ code: '500', msg: 'Denied', data: null });
  });
  const client = createRequestClient({
    baseURL: 'https://api.example.com',
    successCode: 10000,
  });

  const profile = await client.get('/profile');
  assert.equal(profile.id, 'profile-1');
  const wrappedProfile = await client.get('/profile', { unwrapData: false });
  assert.equal(wrappedProfile.data.id, 'profile-2');
  await assert.rejects(
    client.get('/profile'),
    error => error instanceof BusinessError && error.code === '500'
  );
  assert.equal(captures.length, 1);
});

test('returns HTTP errors with status and parsed payload', async () => {
  const { createRequestClient, RequestError, captures } = loadRequest(async () =>
    jsonResponse(
      { message: 'Unavailable' },
      { ok: false, status: 503, statusText: 'Service Unavailable' }
    )
  );
  const client = createRequestClient({ baseURL: 'https://api.example.com' });

  await assert.rejects(
    client.get('/health', { params: { token: 'secret' } }),
    error =>
      error instanceof RequestError &&
      error.status === 503 &&
      error.payload.message === 'Unavailable'
  );
  assert.equal(captures.length, 1);
  assert.equal(captures[0].context.url, 'https://api.example.com/health');
});

test('serializes JSON bodies and normalizes request interceptor errors', async () => {
  const calls = [];
  const { createRequestClient, RequestError, captures } = loadRequest(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse({ created: true });
  });
  const client = createRequestClient({ baseURL: 'https://api.example.com' });

  await client.post('/profiles', { name: 'Ada' });
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.body, '{"name":"Ada"}');
  assert.equal(calls[0].init.headers.get('content-type'), 'application/json');

  client.interceptors.request.use(() => {
    throw new Error('Missing token');
  });
  await assert.rejects(
    client.get('/profile'),
    error => error instanceof RequestError && error.message === 'Missing token'
  );
  assert.equal(captures.length, 1);
});

test('keeps FormData intact and applies response interceptors', async () => {
  const calls = [];
  const { createRequestClient } = loadRequest(async (url, init) => {
    calls.push({ url, init });
    return jsonResponse({ uploaded: true });
  });
  const client = createRequestClient({ baseURL: 'https://api.example.com' });
  client.interceptors.response.use(payload => ({ ...payload, source: 'api' }));
  const formData = new FormData();
  formData.append('name', 'Ada');

  const result = await client.post('/uploads', formData);

  assert.strictEqual(calls[0].init.body, formData);
  assert.equal(calls[0].init.headers.has('content-type'), false);
  assert.equal(result.source, 'api');
});

test('runs middleware around the request pipeline and passes updated config', async () => {
  const events = [];
  const calls = [];
  const { createRequestClient } = loadRequest(async (url, init) => {
    calls.push({ url, init });
    events.push('fetch');
    return jsonResponse({ id: 'profile-1' });
  });
  const client = createRequestClient({ baseURL: 'https://api.example.com' });

  client.use(async (context, next) => {
    events.push('outer:before');
    const result = await next({
      ...context.config,
      headers: { ...context.config.headers, 'X-Request-Source': 'middleware' },
    });
    events.push('outer:after');
    return { ...result, observed: true };
  });
  client.use(async (_context, next) => {
    events.push('inner:before');
    const result = await next();
    events.push('inner:after');
    return result;
  });

  const result = await client.get('/profile');

  assert.equal(events.join(','), 'outer:before,inner:before,fetch,inner:after,outer:after');
  assert.equal(calls[0].init.headers.get('x-request-source'), 'middleware');
  assert.equal(result.observed, true);
});

test('lets middleware retry downstream without reporting a recovered error', async () => {
  const calls = [];
  const { createRequestClient, RequestError, captures } = loadRequest(async (_url, init) => {
    calls.push(init);
    return calls.length === 1
      ? jsonResponse(
          { message: 'Expired token' },
          { ok: false, status: 401, statusText: 'Unauthorized' }
        )
      : jsonResponse({ id: 'profile-1' });
  });
  const client = createRequestClient({ baseURL: 'https://api.example.com' });

  client.use(async (context, next) => {
    try {
      return await next();
    } catch (error) {
      if (!(error instanceof RequestError) || error.status !== 401) {
        throw error;
      }

      return next({
        ...context.config,
        headers: { ...context.config.headers, Authorization: 'Bearer refreshed' },
      });
    }
  });

  const result = await client.get('/profile');

  assert.equal(result.id, 'profile-1');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].headers.get('authorization'), 'Bearer refreshed');
  assert.equal(captures.length, 0);
});

test('normalizes and reports middleware errors once', async () => {
  const { createRequestClient, RequestError, captures } = loadRequest(async () =>
    jsonResponse({ ok: true })
  );
  const client = createRequestClient({ baseURL: 'https://api.example.com' });
  client.use(async () => {
    throw new Error('Middleware failed');
  });

  await assert.rejects(
    client.get('/profile'),
    error => error instanceof RequestError && error.message === 'Middleware failed'
  );
  assert.equal(captures.length, 1);
});

test('distinguishes timeout from caller cancellation and preserves the cancel reason', async () => {
  const neverResponds = (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(abortError()), {
        once: true,
      });
    });
  const { createRequestClient, CancelError, TimeoutError } = loadRequest(neverResponds);
  const client = createRequestClient({ baseURL: 'https://api.example.com' });

  await assert.rejects(
    client.get('/slow', { timeoutMs: 5 }),
    error => error instanceof TimeoutError
  );

  const controller = new AbortController();
  const pending = client.get('/cancel', { signal: controller.signal, timeoutMs: 50 });
  controller.abort('screen closed');
  await assert.rejects(
    pending,
    error => error instanceof CancelError && error.reason === 'screen closed'
  );
});

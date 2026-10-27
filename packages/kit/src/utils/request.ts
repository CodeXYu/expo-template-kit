import { captureException } from '../services/monitoring/error-reporting';

import { logger } from './logger';

export type BaseResponse<T = unknown> = {
  code: string | number;
  msg?: string;
  data?: T;
};

export type RequestParamPrimitive = string | number | boolean | null | undefined;
export type RequestParamValue = RequestParamPrimitive | RequestParamPrimitive[];
export type RequestParams = Record<string, RequestParamValue>;

export type RequestData = BodyInit | Record<string, unknown> | unknown[] | null | undefined;

export type RequestMeta = {
  url: string;
  method: string;
  params?: RequestParams;
  status?: number;
};

export type RequestConfig = Omit<RequestInit, 'body' | 'signal' | 'method'> & {
  baseURL?: string;
  url?: string;
  method?: string;
  params?: RequestParams;
  data?: RequestData;
  timeoutMs?: number;
  unwrapData?: boolean;
  successCode?: string | number;
  signal?: AbortSignal;
};

export type RequestOptions = Omit<RequestConfig, 'baseURL' | 'url'>;

export type RequestConfigWithUrl = RequestConfig & { url: string };

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
  payload: unknown,
  meta: RequestMeta
) => unknown | Promise<unknown>;

export type RequestMiddlewareContext = {
  config: RequestConfigWithUrl;
  meta: RequestMeta;
};

export type RequestMiddlewareNext = (config?: RequestConfigWithUrl) => Promise<unknown>;

/**
 * Wraps the remaining request pipeline. Calling `next` again retries only the
 * downstream pipeline, so retrying middleware must enforce its own limit.
 */
export type RequestMiddleware = (
  context: RequestMiddlewareContext,
  next: RequestMiddlewareNext
) => Promise<unknown>;

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: unknown,
    public meta: RequestMeta
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

export class BusinessError<T = unknown> extends Error {
  constructor(
    message: string,
    public code: string,
    public payload: BaseResponse<T>,
    public meta: RequestMeta
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class TimeoutError extends RequestError {
  constructor(
    public timeoutMs: number,
    meta: RequestMeta
  ) {
    super(
      `Request timed out after ${timeoutMs}ms`,
      0,
      { reason: 'timeout', timeoutMs },
      { ...meta, status: 0 }
    );
    this.name = 'TimeoutError';
  }
}

export class CancelError extends Error {
  constructor(
    public reason: unknown,
    public meta: RequestMeta
  ) {
    super('Request cancelled');
    this.name = 'CancelError';
  }
}

export type RequestMethod<Config extends RequestConfig = RequestConfig> = {
  <T>(config: Config & { unwrapData?: true }): Promise<T>;
  <T>(config: Config & { unwrapData: false }): Promise<BaseResponse<T>>;
};

export type RequestGetMethod<Options extends RequestOptions = RequestOptions> = {
  <T>(url: string, config?: Omit<Options, 'method' | 'data'> & { unwrapData?: true }): Promise<T>;
  <T>(
    url: string,
    config: Omit<Options, 'method' | 'data'> & { unwrapData: false }
  ): Promise<BaseResponse<T>>;
};

export type RequestBodyMethod<Options extends RequestOptions = RequestOptions> = {
  <T>(
    url: string,
    data?: RequestData,
    config?: Omit<Options, 'method'> & { unwrapData?: true }
  ): Promise<T>;
  <T>(
    url: string,
    data: RequestData | undefined,
    config: Omit<Options, 'method'> & { unwrapData: false }
  ): Promise<BaseResponse<T>>;
};

export type RequestClient = {
  request: RequestMethod<RequestConfigWithUrl>;
  get: RequestGetMethod;
  post: RequestBodyMethod;
  put: RequestBodyMethod;
  patch: RequestBodyMethod;
  delete: RequestBodyMethod;
  use: (middleware: RequestMiddleware) => () => void;
  interceptors: {
    request: {
      use: (interceptor: RequestInterceptor) => () => void;
    };
    response: {
      use: (interceptor: ResponseInterceptor) => () => void;
    };
  };
};

const DEFAULT_TIMEOUT_MS = 30000;

export function createRequestClient(defaultConfig: RequestConfig = {}) {
  const middlewares: RequestMiddleware[] = [];
  const requestInterceptors: RequestInterceptor[] = [];
  const responseInterceptors: ResponseInterceptor[] = [];

  const performRequest = async <T>(
    initialConfig: RequestConfigWithUrl
  ): Promise<T | BaseResponse<T>> => {
    let meta: RequestMeta = {
      url: initialConfig.url,
      method: (initialConfig.method ?? 'GET').toUpperCase(),
      params: initialConfig.params,
    };
    let cleanup = () => {};
    let didTimeout = () => false;
    let getCancelReason = () => undefined as unknown;
    let isAborted = () => false;
    let timeoutMs = initialConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    try {
      let config: RequestConfig = initialConfig;
      for (const interceptor of requestInterceptors) {
        config = await interceptor(config);
      }

      const method = (config.method ?? 'GET').toUpperCase();
      timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const unwrapData = config.unwrapData ?? true;
      const successCode = config.successCode;
      meta = {
        url: config.url ?? '',
        method,
        params: config.params,
      };
      const url = buildUrl(config.url, config.baseURL, config.params, method);
      meta = {
        ...meta,
        url,
      };
      const requestSignal = createRequestSignal(timeoutMs, config.signal);
      cleanup = requestSignal.cleanup;
      didTimeout = requestSignal.didTimeout;
      getCancelReason = requestSignal.getCancelReason;
      isAborted = requestSignal.isAborted;

      assertMethodAllowsData(method, config.data);

      const {
        baseURL: _baseURL,
        url: _url,
        params: _params,
        data: _data,
        timeoutMs: _timeoutMs,
        unwrapData: _unwrapData,
        successCode: _successCode,
        ...requestInit
      } = config;
      const headers = new Headers(requestInit.headers);
      const body = normalizeData(config.data, headers);

      const response = await fetch(url, {
        ...requestInit,
        method,
        body,
        headers,
        signal: requestSignal.signal,
      });

      const responseMeta: RequestMeta = {
        ...meta,
        status: response.status,
      };
      const text = await response.text();
      const payload = text ? safeParseJson(text) : null;

      if (!response.ok) {
        throw new RequestError(
          `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
          response.status,
          payload,
          responseMeta
        );
      }

      let processedPayload = payload;
      for (const interceptor of responseInterceptors) {
        processedPayload = await interceptor(processedPayload, responseMeta);
      }

      if (isBusinessResponse(processedPayload)) {
        if (successCode !== undefined) {
          const responseCode = String(processedPayload.code);
          if (responseCode !== String(successCode)) {
            throw new BusinessError(
              processedPayload.msg || 'Request failed',
              responseCode,
              processedPayload,
              responseMeta
            );
          }

          return (unwrapData ? processedPayload.data : processedPayload) as T | BaseResponse<T>;
        }

        if (unwrapData === false) {
          return processedPayload as BaseResponse<T>;
        }
      }

      if (unwrapData === false) {
        throw new RequestError(
          'Expected a business response with a code field',
          responseMeta.status ?? 0,
          processedPayload,
          responseMeta
        );
      }

      return processedPayload as T;
    } catch (error) {
      // if (didTimeout() && (isAbortError(error) || isAborted())) {
      //   throw new TimeoutError(timeoutMs, meta);
      // }
      if (didTimeout()) {
        throw new TimeoutError(timeoutMs, meta);
      }

      if (isAbortError(error) || isAborted()) {
        throw new CancelError(getCancelReason() ?? getErrorMessage(error), meta);
      }

      if (
        error instanceof RequestError ||
        error instanceof BusinessError ||
        error instanceof CancelError
      ) {
        throw error;
      }

      throw new RequestError(getErrorMessage(error) ?? 'Unknown request error', 0, error, {
        ...meta,
        status: 0,
      });
    } finally {
      cleanup();
    }
  };

  const executeRequest = async <T>(
    inputConfig: RequestConfigWithUrl
  ): Promise<T | BaseResponse<T>> => {
    const initialConfig = mergeRequestConfig(defaultConfig, inputConfig);
    const requestMiddlewares = [...middlewares];
    const initialMeta = createRequestMeta(initialConfig);

    const dispatch = async (
      index: number,
      currentConfig: RequestConfigWithUrl
    ): Promise<unknown> => {
      const middleware = requestMiddlewares[index];
      if (!middleware) {
        return performRequest<T>(currentConfig);
      }

      return middleware(
        {
          config: currentConfig,
          meta: createRequestMeta(currentConfig),
        },
        nextConfig => dispatch(index + 1, nextConfig ?? currentConfig)
      );
    };

    try {
      return (await dispatch(0, initialConfig)) as T | BaseResponse<T>;
    } catch (error) {
      if (error instanceof CancelError) {
        logger.info('Request cancelled', {
          url: getObservableRequestUrl(error.meta.url),
          method: error.meta.method,
          reason: error.reason,
        });
        throw error;
      }

      const requestError =
        error instanceof RequestError || error instanceof BusinessError
          ? error
          : new RequestError(getErrorMessage(error) ?? 'Unknown request error', 0, error, {
              ...initialMeta,
              status: 0,
            });
      reportRequestError(requestError);
      throw requestError;
    }
  };

  const request = (<T>(config: RequestConfigWithUrl) =>
    executeRequest<T>(config)) as RequestClient['request'];

  const get = (<T>(url: string, config: Omit<RequestOptions, 'method' | 'data'> = {}) =>
    executeRequest<T>({
      ...config,
      url,
      method: 'GET',
    })) as RequestClient['get'];

  const createBodyMethod = (method: string) =>
    (<T>(url: string, data?: RequestData, config: Omit<RequestOptions, 'method'> = {}) =>
      executeRequest<T>({
        ...config,
        url,
        data,
        method,
      })) as RequestBodyMethod;

  const client: RequestClient = {
    request,
    get,
    post: createBodyMethod('POST'),
    put: createBodyMethod('PUT'),
    patch: createBodyMethod('PATCH'),
    delete: createBodyMethod('DELETE'),
    use: middleware => {
      middlewares.push(middleware);
      return () => {
        removeInterceptor(middlewares, middleware);
      };
    },
    interceptors: {
      request: {
        use: interceptor => {
          requestInterceptors.push(interceptor);
          return () => {
            removeInterceptor(requestInterceptors, interceptor);
          };
        },
      },
      response: {
        use: interceptor => {
          responseInterceptors.push(interceptor);
          return () => {
            removeInterceptor(responseInterceptors, interceptor);
          };
        },
      },
    },
  };

  return client;
}

export const requestClient = createRequestClient();

export const request = requestClient.request;
export const get = requestClient.get;
export const post = requestClient.post;
export const put = requestClient.put;
export const patch = requestClient.patch;
export const del = requestClient.delete;

export default requestClient;

function mergeRequestConfig(
  baseConfig: RequestConfig,
  overrideConfig: RequestConfigWithUrl
): RequestConfigWithUrl {
  const headers = new Headers(baseConfig.headers);
  new Headers(overrideConfig.headers).forEach((value, key) => {
    headers.set(key, value);
  });

  return {
    ...baseConfig,
    ...overrideConfig,
    headers: headersToRecord(headers),
  };
}

function createRequestMeta(config: RequestConfigWithUrl): RequestMeta {
  return {
    url: config.url,
    method: (config.method ?? 'GET').toUpperCase(),
    params: config.params,
  };
}

function buildUrl(path = '', baseURL = '', params?: RequestParams, method = 'GET') {
  const normalizedPath = path.trim();
  const normalizedBaseURL = baseURL.trim();

  if (!normalizedPath) {
    throw new RequestError('Missing request url', 0, null, {
      url: '',
      method,
      params,
      status: 0,
    });
  }

  if (!normalizedBaseURL && !isAbsoluteUrl(normalizedPath)) {
    throw new RequestError('Missing request baseURL', 0, null, {
      url: path,
      method,
      params,
      status: 0,
    });
  }

  const url = isAbsoluteUrl(normalizedPath)
    ? new URL(normalizedPath)
    : new URL(normalizedPath.replace(/^\/+/, ''), normalizeBaseURLForPath(normalizedBaseURL));

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      appendSearchParam(url.searchParams, key, value);
    }
  }

  return url.toString();
}

function normalizeBaseURLForPath(baseURL: string) {
  const url = new URL(baseURL);
  url.search = '';
  url.hash = '';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url;
}

function appendSearchParam(searchParams: URLSearchParams, key: string, value: RequestParamValue) {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendSearchParam(searchParams, key, item);
    }
    return;
  }

  if (value === undefined) {
    return;
  }

  searchParams.append(key, value === null ? '' : String(value));
}

function normalizeData(data: RequestData, headers: Headers) {
  if (data === undefined || data === null) return undefined;
  if (typeof data === 'string') return data;
  if (isNativeBody(data)) return data;

  if (Array.isArray(data) || isPlainObject(data)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return JSON.stringify(data);
  }

  return data as BodyInit;
}

function createRequestSignal(timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let outcome: 'pending' | 'timeout' | 'cancelled' = 'pending';
  let cancelReason: unknown;

  const timeoutId = setTimeout(() => {
    if (controller.signal.aborted) {
      return;
    }

    outcome = 'timeout';
    controller.abort('timeout');
  }, timeoutMs);

  const handleExternalAbort = () => {
    if (controller.signal.aborted) {
      return;
    }

    outcome = 'cancelled';
    cancelReason = externalSignal?.reason;
    clearTimeout(timeoutId);
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      handleExternalAbort();
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => outcome === 'timeout',
    getCancelReason: () => cancelReason,
    isAborted: () => controller.signal.aborted,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', handleExternalAbort);
    },
  };
}

function assertMethodAllowsData(method: string, data: RequestData) {
  if (data === undefined || data === null) return;

  if (method === 'GET' || method === 'HEAD') {
    throw new Error(
      `Request method ${method} does not support data. Use params for query values instead.`
    );
  }
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isBusinessResponse(value: unknown): value is BaseResponse<unknown> {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'code' in value &&
    (typeof (value as BaseResponse<unknown>).code === 'string' ||
      typeof (value as BaseResponse<unknown>).code === 'number')
  );
}

function isAbortError(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

function getErrorMessage(error: unknown) {
  return error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) return true;

  const constructor = Object.prototype.hasOwnProperty.call(prototype, 'constructor')
    ? prototype.constructor
    : undefined;
  return (
    typeof constructor === 'function' &&
    Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object)
  );
}

function isNativeBody(value: unknown): value is BodyInit {
  return (
    (typeof FormData !== 'undefined' && value instanceof FormData) ||
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) ||
    ArrayBuffer.isView(value) ||
    (typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams)
  );
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function removeInterceptor<T>(interceptors: T[], interceptor: T) {
  const index = interceptors.indexOf(interceptor);
  if (index !== -1) {
    interceptors.splice(index, 1);
  }
}

function headersToRecord(headers: Headers) {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function getObservableRequestUrl(value: string) {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

function reportRequestError(error: RequestError | BusinessError) {
  captureException(error, {
    layer: 'request',
    url: getObservableRequestUrl(error.meta.url),
    method: error.meta.method,
    status: error.meta.status,
  });
}

# 请求客户端

生成项目在 `src/services/api.ts` 创建唯一的项目请求客户端：

```ts
import { api, apiRequestConfig } from '@/services/api';
```

它复用 `expo-template-kit` 的 fetch 请求器，但由项目代码显式传入配置，避免共享包读取
项目的 `EXPO_PUBLIC_*` 环境变量。

## 默认配置

`apiRequestConfig` 当前包含以下可由产品后端调整的参数：

| 参数          | 默认值                     | 作用                         |
| ------------- | -------------------------- | ---------------------------- |
| `baseURL`     | `EXPO_PUBLIC_API_BASE_URL` | 相对请求地址的 API 根地址    |
| `timeoutMs`   | `30_000`                   | 单次请求超时时间，单位为毫秒 |
| `successCode` | `"10000"`                  | 业务包裹响应的成功码         |

这些默认值与共享请求器原有行为一致。要更改项目协议，编辑 `src/services/api.ts` 后重新构建；
不要在页面中重新创建客户端。`EXPO_PUBLIC_*` 会进入客户端 bundle，只能保存公开配置，不能
保存 Token、密码或其他密钥。

`baseURL` 会被当作 API 根地址。带路径的根地址会被保留，例如
`https://api.example.com/v1` 配合 `/profile` 会请求
`https://api.example.com/v1/profile`。绝对 `http://` 或 `https://` URL 则会绕过该根地址。

## 基本调用与响应

```ts
type Profile = { id: string; name: string };

const profile = await api.get<Profile>('/profile');
await api.post<Profile>('/profile', { name: 'Ada' });
```

普通 JSON 响应直接返回。项目 `api` 已显式配置 `successCode: "10000"`，所以其
`{ code, msg?, data? }` 业务包裹会在成功时返回 `data`，失败时抛出 `BusinessError`。
直接调用未配置 `successCode` 的 `createRequestClient` 不会猜测后端响应协议。

需要完整业务包裹时传入 `unwrapData: false`；此选项要求响应确实包含 `code` 字段：

```ts
const response = await api.get<Profile>('/profile', { unwrapData: false });
const data = response.data;
```

## 错误、超时与取消

HTTP 非 2xx 响应抛出 `RequestError`，业务失败抛出 `BusinessError`，超时抛出
`TimeoutError`，主动中止抛出 `CancelError`。错误包含请求元数据，页面应沿用项目既有的
错误呈现路径。监控和取消日志中的 URL 会移除 query 与 hash，避免记录潜在敏感参数。

页面展示不要直接使用 `error.message`。共享包提供统一错误模型：

```ts
import { getErrorMessage, isAuthError, isRetryable, normalizeError } from 'expo-template-kit';

const normalized = normalizeError(error);
const message = getErrorMessage(error, t);
const canRetry = isRetryable(error);
const shouldLogin = isAuthError(error);
```

`createDefaultQueryClient()` 默认只对网络错误、超时、408、429 和 5xx 重试一次；
401/403/404、业务错误和取消不会自动重试。需要展示后端业务文案时，显式使用
`getErrorMessage(error, t, { preferServerMessage: true })`，不要默认透传技术错误。

```ts
import { CancelError, TimeoutError } from 'expo-template-kit';

const controller = new AbortController();
const pending = api.get<Profile>('/profile', {
  signal: controller.signal,
  timeoutMs: 5_000,
});
controller.abort();

try {
  await pending;
} catch (error) {
  if (error instanceof TimeoutError || error instanceof CancelError) {
    // Handle the known request outcome in the page logic layer.
  }
}
```

## 中间件与拦截器

大多数认证头或响应字段转换继续使用 `interceptors.request/response`。只有同时需要请求前、
响应后、错误捕获或受控重试时，才使用 `use` 注册洋葱中间件：

```ts
import { logger } from 'expo-template-kit';

const removeMiddleware = api.use(async (context, next) => {
  const startedAt = Date.now();

  try {
    return await next({
      ...context.config,
      headers: { ...context.config.headers, 'X-Client': 'mobile' },
    });
  } finally {
    logger.info('API request completed', {
      method: context.meta.method,
      elapsedMs: Date.now() - startedAt,
    });
  }
});

removeMiddleware();
```

中间件按注册顺序进入、反向退出。`next` 可再次调用以重试其下游请求，但请求器不会猜测
重试条件或次数；认证刷新等产品规则必须放在生成项目的 `src/services/api.ts`，并显式限制
为一次重试。被中间件成功恢复的错误不会上报，最终抛出的错误才由请求器统一归一化和上报。

## 上传与绝对 URL

项目共享的认证或观测规则可在 `src/services/api.ts` 通过拦截器注册。`use` 会返回注销函数，
只应在需要临时规则时调用该函数；常驻规则在模块初始化时注册一次。

```ts
const removeRequestInterceptor = api.interceptors.request.use(config => ({
  ...config,
  headers: { ...config.headers, 'X-Client': 'mobile' },
}));

removeRequestInterceptor();
```

传入 `FormData`、`Blob`、`ArrayBuffer` 或 `URLSearchParams` 时，请求器不会 JSON 序列化。
上传 `FormData` 时不要手动设置 `Content-Type`，让运行时附加 multipart boundary。

绝对 `http://` 或 `https://` URL 可绕过 `baseURL`：

```ts
await api.get<Profile>('https://status.example.com/profile');
```

相对 GET 查询使用 `params`，不要向 GET 或 HEAD 传入 `data`。页面请求仍放在页面的
`index.api.ts`；项目级认证或拦截规则只放在 `src/services/api.ts`。

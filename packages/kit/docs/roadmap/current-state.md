# 当前状态基线

- 更新日期：2026-10-23
- 代码基线：`d858eb2`（P0-1 `42dd14c` + 测试补充 `d858eb2` + `refreshNetworkStatus` 依赖修复 `19da002`）
- 适用范围：仓库根共享包与生成项目模板
- 计划入口：[`optimization-plan.md`](./optimization-plan.md)

## 已落地能力

### 1. FlashList 列表容器

- 新增 `src/components/page-kit/page-list/index.tsx`。
- 复用 `BasePage` 的导航、安全区、页面状态和键盘处理。
- 支持下拉刷新、分页加载、加载更多、无更多、空态和 `listProps` 透传。
- `onEndReached` 在 `loadingMore` 期间自动防重。
- 已导出到 `expo-template-kit` 根入口。

### 2. Expo SDK 58 支持

- 生成项目默认目标改为 SDK 58。
- CLI 支持 `54 / 56 / 57 / 58`，SDK 58 通过 `expo install` 解析原生模块版本。
- 共享包 peer 范围已扩展到 SDK 58。
- SDK 58 下的关键解析版本包括 React Native `0.88`、FlashList `2.3.2` 和 Sentry `~8.28.0`。
- SDK 矩阵验证中 56、57、58 通过。

### 3. Sentry 与可注入错误监控

- `ErrorReporter` 接口已导出，`initErrorReporting(reporter)` 支持项目侧注入。
- 生成项目新增 `template/src/config/sentry.ts` 和 `template/metro.config.js`。
- 根布局使用 `Sentry.wrap`，并注册 Expo Router 导航容器。
- 启动错误和路由边界错误已接入 `captureException`。
- 重复初始化会保持 no-op；reporter 初始化和上报异常有 logger 兜底。

### 4. 错误模型与 Query 重试

- 新增 `src/utils/error.ts`，提供 `normalizeError`、`getErrorMessage`、`isRetryable` 和 `isAuthError`。
- 错误分类覆盖 network、timeout、cancel、http、business、unknown。
- `ErrorView` 不再直接展示 `error.message`，按错误类型映射 i18n 文案；需要服务端业务文案时必须显式选择。
- `PageStatusView` 和 `BasePage` 的 `pageError` 已放宽为 `unknown`。
- `createDefaultQueryClient()` 只对网络错误、超时、408、429 和 5xx 重试一次；401/403/404、业务错误和取消不重试。
- 中英文 locale 新增 `errors.*` 文案，并加入对齐测试。
- 新增 `test/error-model.test.mjs`，覆盖错误分类、HTTP 文案映射、重试谓词和 QueryClient wiring。
- `BasePage` 的 `refreshNetworkStatus` 已补入 `useFocusEffect` 依赖，lint warning 已消除。

### 5. 验证基础

- 请求错误模型已有 `RequestError`、`BusinessError`、`TimeoutError`、`CancelError`。
- 生成项目已包含 `BasePage`、`PageStatusView`、`ErrorView`、`OfflineView` 和 Overlay/Toast/Loading 基础能力。
- 测试覆盖已扩展到错误监控、PageList、请求、CLI、错误模型和模板生成路径。

## 验证记录

以下结果对应当前代码基线：

| 命令                        | 结果                |
| --------------------------- | ------------------- |
| `npm run typecheck`         | 通过                |
| `npm test`                  | 32/32 通过          |
| `npm run lint`              | 0 error，0 warning  |
| `npm run verify:boundaries` | 通过                |
| `npm run pack:check`        | 通过                |
| `npm run format:check`      | 失败于 5 个既有文件 |
| SDK 矩阵 56/57/58           | 最近一次验证通过    |
| SDK 矩阵 54                 | 未通过，阻塞项见下  |

SDK 矩阵说明：P0-1 只修改共享包错误模型、Query 默认配置和模板文案，没有修改
SDK、原生模块或生成器依赖，因此本轮未重跑完整矩阵；56/57/58 的通过结果来自上一批
SDK 58 改动。

当前 Prettier 失败文件：

- `docs/migrations/v1.0.13.md`
- `src/components/ui-kit/button/index.tsx`
- `src/components/ui-kit/overlay/internal/OverlayBase.tsx`
- `src/components/ui-kit/overlay/internal/OverlayModal.tsx`
- `src/providers/theme-provider.tsx`

SDK 54 的既有阻塞：

- 默认模板残留根目录 `components/`、`hooks/` 等文件，清理逻辑只覆盖 `app` 和 `src`。
- `BasePage` 的 `automaticOffset` 与 SDK 54 的 `react-native-keyboard-controller` 类型不匹配。
- `ui-kit/loading` 的 `StyleSheet.absoluteFill` 展开类型在 SDK 54 下报错。

这些是既有问题，不应混入下一批业务闭环改动。

## 已知限制

| 领域         | 当前限制                                                               |
| ------------ | ---------------------------------------------------------------------- |
| 全局 Loading | 单例状态，并发请求会互相关闭                                           |
| Toast        | 单例展示，新 Toast 会直接替换旧 Toast                                  |
| 监控         | 缺 `setUser`、breadcrumb、全局 JS 错误和未处理 Promise 捕获            |
| 请求上报     | 请求层会把所有 `RequestError` / `BusinessError` 上报，业务错误容易刷屏 |
| 防重         | `TouchableWrapper` 只有时间节流，没有异步操作锁                        |
| 确认交互     | 只有底层 Overlay，缺 `confirm()` / `showActionSheet()` 高层 API        |
| 鉴权         | 没有 AuthProvider、路由守卫和 401 统一处理                             |
| 包结构       | 根入口统一导出 UI，optional peer 实际不完全 optional                   |
| 多 SDK       | 支持清单仍有人工维护点，缺 manifest 和 CI 原生构建                     |
| 文档         | 部分组件文档仍写死旧 SDK 版本或有旧 API 文案                           |

## 更新方式

完成一个批次后：

1. 更新本文件的“已落地能力”和“验证记录”。
2. 把 `optimization-plan.md` 中对应项标记为 `DONE`。
3. 记录代码提交、验证命令和仍然存在的限制。
4. 如发现新问题，先在计划中新增条目，不要只留在聊天记录里。

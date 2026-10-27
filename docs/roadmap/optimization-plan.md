# 后续优化计划

- 状态：ACTIVE
- 更新日期：2026-10-23
- 代码基线：`d858eb2`
- 当前基线：[`current-state.md`](./current-state.md)
- 原始分析：[`archive/2026-10-23-original-optimization-plan.md`](./archive/2026-10-23-original-optimization-plan.md)

## 目标

优先补齐业务闭环中最影响日常开发的基础能力：错误模型、并发反馈、监控和异步防重。当前阶段不追求扩大组件数量，而是把已有组件和基础设施做稳。

## 执行约束

- 不新增 `src/components` 下的 UI 组件目录。
- 优先修改现有 `ErrorView`、`PageStatusView`、`BasePage`、`PageList`、`Button`、`Input`、`Loading`、`Toast` 和 `Overlay`。
- 新增能力优先放在现有组件的 API、hooks、services 或 utils 中。
- 只有现有组件无法合理承载，并且至少有两个稳定使用点时，才重新评审新增组件。
- 不把 SDK 54 兼容清理、组件新增和业务闭环优化混在同一批提交中。

## P0：业务闭环

### P0-1 错误模型、Query 重试与本地化展示

- 状态：`[x]` DONE
- 完成记录：`42dd14c`、测试补充 `d858eb2`；相关依赖修复见 `19da002`
- 结果：`normalizeError`、`getErrorMessage`、`isRetryable`、`isAuthError` 已导出；
  `ErrorView` 已接入本地化错误文案；Query 默认只重试瞬时错误；测试 32/32 通过。
- 目标：统一错误分类、用户文案和重试策略，避免把服务端技术错误直接展示给用户。
- 涉及文件：
  - `src/utils/error.ts`（新增非 UI 工具）
  - `src/utils/request.ts`
  - `src/lib/query-client.ts`
  - `src/components/page-kit/error-view/index.tsx`
  - `src/components/page-kit/page-status-view/index.tsx`
  - `src/components/page-kit/base-page/index.tsx`
  - `template/src/i18n/locales/zh-CN.ts`
  - `template/src/i18n/locales/en.ts`
- 内容：
  - 提供 `normalizeError`、`getErrorMessage`、`isRetryable`、`isAuthError`。
  - 错误类型至少覆盖 network、timeout、cancel、http、business、unknown。
  - `ErrorView` 接收 `unknown`，按状态码/错误类型映射本地化文案；需要展示服务端文案时显式允许。
  - `PageStatusView`、`BasePage` 的 `pageError` 放宽为 `unknown`，去掉空 `Error` 兜底。
  - Query 重试改为 `failureCount < 1 && isRetryable(error)`。
  - 401/403/404、业务错误、取消不重试；网络、超时、5xx 可重试。
- 验收：
  - 4xx/业务/取消不触发重试；网络/超时/5xx 最多重试一次。
  - 用户界面不再直接出现 `RequestError` 的英文技术文案。
  - 补充错误分类、文案映射和重试谓词测试。

### P0-2 keyed Loading 与并发引用计数

- 状态：`[ ]` TODO
- 目标：多个并发请求同时展示 Loading 时，关闭其中一个不会误关其他 Loading。
- 涉及文件：
  - `src/components/ui-kit/loading/index.tsx`
- 内容：
  - `showLoading({ key })` 返回当前 key 的 `hide` 函数。
  - `hideLoading(key?)` 支持按 key 关闭；无参数时保留全量关闭兼容行为。
  - 内部按 key 维护状态、引用计数和 timer。
  - 增加 `withLoading(task, options)` 包装异步任务。
  - `LoadingOverlay` 和 `GlobalLoadingHost` 继续使用现有实现，不新增组件。
- 验收：
  - 两个 key 并发展示/关闭互不影响。
  - 自动关闭、手动关闭、最后一个 Loading 消失后 Overlay 才隐藏。
  - 补充并发和 timer 测试。

### P0-3 Toast 队列与替换策略

- 状态：`[ ]` TODO
- 目标：避免连续反馈时旧 Toast 被直接覆盖，同时保持现有调用兼容。
- 涉及文件：
  - `src/components/ui-kit/toast/index.tsx`
- 内容：
  - 增加 `mode: 'replace' | 'queue'`，默认 `replace`。
  - 队列模式按顺序展示，设置合理上限，避免错误连续弹出时无限堆积。
  - `hideToast(id)` 只关闭指定 Toast；`onClose` 只调用一次。
  - 继续复用现有 `ToastContainer` 和 Overlay API。
- 验收：
  - 替换模式行为与当前版本一致。
  - 队列模式顺序正确，关闭当前后继续展示下一条。
  - 补充队列、替换和手动关闭测试。

### P0-4 监控闭环

- 状态：`[ ]` TODO
- 目标：把错误上报从“能注入 Sentry”补齐到“可控、可定位、不会刷屏”。
- 涉及文件：
  - `src/services/monitoring/error-reporting.ts`
  - `src/utils/request.ts`
  - `src/lib/query-client.ts`
  - `template/src/config/sentry.ts`
  - `template/src/app/_layout.tsx`
- 内容：
  - 增加 `setErrorReporter` 别名，保持 `initErrorReporting` 兼容。
  - `ErrorReporter` 增加可选的 `setUser`、`addBreadcrumb`；未实现时安全 no-op。
  - Sentry reporter 实现用户信息、面包屑和消息级别。
  - 安装 React Native `ErrorUtils.setGlobalHandler` 和 Web `unhandledrejection`。
  - 统一请求错误上报策略：默认只上报网络、超时、5xx 和未知错误；4xx、业务错误、取消默认不上报。
  - Query 层继续跳过已由请求层处理的错误，避免重复上报。
- 验收：
  - 业务错误和预期 401/403 不进入 Sentry。
  - 未捕获 JS 错误和未处理 Promise 能被上报。
  - 登录/登出可以设置或清除用户信息；关键操作可以添加面包屑。
  - 补充 reporter 可选方法、请求上报策略和全局错误测试。

### P0-5 确认交互与异步防重

- 状态：`[ ]` TODO
- 目标：用现有 Overlay 和 Button 补齐确认弹窗、操作菜单和异步按钮锁。
- 涉及文件：
  - `src/components/ui-kit/overlay/actions.tsx`
  - `src/components/ui-kit/button/index.tsx`
  - `src/components/ui-kit/touchable-wrapper/index.tsx`
- 内容：
  - 在 `overlay/actions.tsx` 增加 `confirm()`、`alert()`、`showActionSheet()`。
  - 复用现有 `OverlayModal`、`OverlaySheet`、`Button` 和 `ListRow`，不新增组件目录。
  - Button 增加 `autoLoading`，支持 `onPress` 返回 Promise，执行期间自动禁用。
  - `TouchableWrapper` 的 `onPress` 类型放宽为 `void | Promise<void>`，异常交给调用方或监控。
- 验收：
  - `confirm()` 能返回 `true/false`，取消和确认路径都可关闭。
  - 长请求执行期间重复点击不会再次触发。
  - 补充按钮异步锁和确认 API 测试。

## P1：现有组件质量与工程化

### P1-1 现有组件修复

| 文件                                                         | 改动                                                                | 状态  |
| ------------------------------------------------------------ | ------------------------------------------------------------------- | ----- |
| `src/components/ui-kit/input/index.tsx`                      | 修复非受控 `defaultValue` 下清空无效；再评估密码显隐和字符计数      | `[ ]` |
| `src/components/page-kit/page-status-view/index.tsx`         | 空态行动按钮、错误态自定义标题/操作，复用 `Button`                  | `[ ]` |
| `src/components/page-kit/empty/index.tsx`                    | 去掉 `safeAreaFrame.height / 2 - 240` 魔法数                        | `[ ]` |
| `src/components/ui-kit/loading/index.tsx`                    | 使用 `ui.typography.loading`，移除硬编码字号                        | `[ ]` |
| `src/components/ui-kit/list-row/index.tsx`                   | 使用 `ui.listRow.minHeight` 和 `ui.typography.listTitle/listDetail` | `[ ]` |
| `src/components/ui-kit/button/index.tsx`                     | 增加 `fullWidth` / auto width 模式，默认保持全宽                    | `[ ]` |
| `src/components/page-kit/base-page/index.tsx`                | 补 `refreshNetworkStatus` 依赖，消除 lint warning                   | `[x]` |
| `src/components/ui-kit/animated-touchable-wrapper/index.tsx` | 移除 gesture-handler 深层类型导入                                   | `[ ]` |

注意：`button/index.tsx`、`OverlayBase.tsx`、`OverlayModal.tsx` 等文件当前已有 Prettier 失败记录。触碰时只格式化对应文件，不做全仓格式化。

### P1-2 文档一致性

- 状态：`[ ]` TODO
- 目标：消除会误导生成项目和 AI agent 的旧版本、旧 API 文案。
- 内容：
  - `AGENTS.md` 不再写死 Expo SDK 56，改为读取生成项目的 `package.json`。
  - `src/components/ui-kit/overlay/README.md` 不再写死 SDK 56。
  - `docs/generated-project-usage.md` 移除已不公开的 `useThemeColor` 表述。
  - SDK/原生依赖版本以生成项目配置和 `expo install` 结果为准。
- 验收：
  - 文档中不再出现与实际默认 SDK 冲突的指令。
  - 新增文档链接能从根 `README.md` 的维护入口找到。

### P1-3 SDK 与发布工程化

- 状态：`[ ]` TODO
- 内容：
  - 引入单一 SDK 清单，统一生成 `supportedExpoSdks`、peer 范围、CLI help 和验证列表。
  - 评估根入口子路径导出，避免只用 request/logger 时拉入 UI 原生依赖。
  - 增加 SDK 矩阵 CI；条件允许时补 iOS/Android 原生构建。
  - 单独清理 SDK 54 的模板残留、`automaticOffset` 和 `StyleSheet.absoluteFill` 类型问题。
- 验收：
  - 新增 SDK 不需要全局搜索替换版本号。
  - CI 能明确区分共享包检查、Web 导出和原生构建。
  - SDK 54 失败项有独立 issue/计划，不阻塞 56/57/58。

### P1-4 鉴权与路由守卫

- 状态：`[ ]` TODO，需先确认产品认证契约
- 说明：这不是纯现有组件改造，会新增 provider、hook 和路由结构；在没有登录接口、刷新策略和角色模型前不进入第一批。
- 内容：
  - `AuthProvider`、`useAuth`、`useRequireAuth`。
  - `Stack.Protected` 路由守卫。
  - 401 刷新、登出清理和受保护页面重定向。
- 验收：
  - 未登录不能进入受保护路由。
  - 401 刷新失败能清理状态并回到登录页。
  - 不在页面里重复初始化认证 Provider。

## P2：暂缓项

以下能力明确暂缓，不在当前阶段新增组件：

- Checkbox、Radio、Switch、SegmentedControl
- Select/Picker、DatePicker、SearchBar、PasswordInput、Stepper
- Skeleton/Shimmer
- Card、PressableCard、Badge/Tag/Chip、Avatar、ProgressBar
- AppImage
- 全局 OfflineBanner
- AppLink、FormActions、FormErrorSummary
- 高级 BottomSheet、SwipeableRow、Tabs、Accordion
- OTP、Slider、Calendar、Carousel、QR 扫描、DragSort、RichText
- 埋点、推送、OTA、EAS 配置和组件厨房水槽

如果后续要解冻，先在本文档补使用场景、复用点、放置层级和验收标准，再单独评审。

## 建议执行顺序

1. P0-1 错误模型 + Query 重试 + 本地化展示（已完成）。
2. P0-2 keyed Loading。
3. P0-3 Toast 队列。
4. P0-4 监控闭环。
5. P0-5 确认交互 + 异步防重。
6. P1-1 现有组件修复。
7. P1-2 文档一致性。
8. P1-3 SDK 与发布工程化。
9. P1-4 鉴权与路由守卫，等待产品契约。

每批完成后更新 [`current-state.md`](./current-state.md)，并把本文档对应项改为 `DONE`。

## 批次验收

至少执行：

```bash
npm run typecheck
npm test
npm run lint
npm run verify:boundaries
npm run pack:check
git diff --check
```

涉及生成项目、SDK、路由或原生配置时，再执行对应的 SDK 矩阵/生成验证；无法执行的检查必须在本目录记录原因和剩余风险。

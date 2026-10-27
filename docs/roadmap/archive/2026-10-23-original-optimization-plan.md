> **归档说明**
>
> 本文是 2026-10-23 的原始优化分析快照，用于保留当时的判断和上下文。
> 部分结论已被后续提交更新，不再作为当前执行依据。
> 最新状态与计划见 [`../README.md`](../README.md)、[`../current-state.md`](../current-state.md)
> 和 [`../optimization-plan.md`](../optimization-plan.md)。

# 总体判断

本轮只做梳理，未修改任何代码。

当前项目已经是一套**可运行的 Expo 最小骨架**：路由、页面壳、主题、i18n、请求、日志、网络状态、启动流程、Overlay/Toast/Loading 都有，而且分层边界比较清楚。  
但它距离“业务快速开发套件”还有明显差距，主要缺在：**鉴权/路由守卫、异步操作防重、列表与表单、错误本地化、监控接入、新 SDK 的自动化支持**。

| 维度                             | 当前状态                                   | 判断                     |
| -------------------------------- | ------------------------------------------ | ------------------------ |
| 基础 UI、页面壳                  | 完整                                       | 可支撑常规页面           |
| 请求、日志、主题、网络、生命周期 | 完整                                       | 可支撑                   |
| 鉴权与路由守卫                   | 基本没有                                   | 不能支撑登录、多角色产品 |
| 防连点                           | 组件级有时间节流，缺异步锁和导航级去重     | 部分支撑                 |
| 列表、表单、反馈                 | 最小集                                     | 快速开发时会重复造轮子   |
| 错误监控                         | 只有 logger reporter，无法替换为 Sentry 等 | 生产环境不足             |
| 多 SDK 支持                      | 白名单 54/56/57                            | 可扩展，但不是自动跟随   |
| 文档                             | 组件文档较细，缺黄金路径和架构总览         | 新成员上手成本高         |

---

# 一、当前主要功能盘点

## 1. 共享包 `expo-template-kit`

| 模块     | 已有能力                                                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 请求     | `createRequestClient`、`get/post/put/patch/delete`、请求/响应拦截器、洋葱中间件、超时、取消、业务码解包、`RequestError/BusinessError/TimeoutError/CancelError` |
| 日志     | `logger.log/info/warn/error`、时间戳、前缀、`logger.create()`、运行时开关                                                                                      |
| 监控     | `initErrorReporting`、`captureException`、`captureMessage`；React Query 错误自动上报                                                                           |
| 主题     | `Colors`、`ThemeProvider`、`useTheme`、`useThemeName`、UI tokens、项目级颜色/组件覆盖                                                                          |
| 设备     | `useDeviceMetrics`，覆盖安全区、横竖屏、分屏、字体缩放                                                                                                         |
| 启动     | `useAppReady`，负责 ready/error/retry 和闪屏隐藏                                                                                                               |
| 生命周期 | `AppLifecycleProvider`、`useAppLifecycle`                                                                                                                      |
| 网络     | `NetworkStatusProvider`、`useNetworkStatus`，前后台切换自动刷新                                                                                                |
| 页面壳   | `BasePage`、`NavBar`、`PageStatusView`、`Empty`、`ErrorView`、`OfflineView`、`PageSection`                                                                     |
| 基础 UI  | `Button`、`Input`、`FormField`、`ListRow`、`Divider`、`ThemedText`、`ThemedView`、`Spinner`                                                                    |
| 交互     | `TouchableWrapper`、`AnimatedTouchableWrapper`，支持 debounce/throttle/全局防连点                                                                              |
| 反馈     | `Loading`/`GlobalLoadingHost`/`showLoading`、`Toast`、`Overlay` 的 Modal/Sheet/Popover                                                                         |
| 查询     | `createDefaultQueryClient`，带默认缓存、重试、错误上报                                                                                                         |

## 2. 生成项目 `template`

- `src/app`：Expo Router 薄路由、根布局、错误边界、404。
- `src/pages/home`：页面契约示例 `index.tsx / index.logic.ts / index.api.ts / index.type.ts`。
- `src/providers`：Query、主题、键盘、手势、安全区、网络、生命周期、Overlay、Loading、Backstage。
- `src/i18n`：i18next 初始化、中英文资源、持久化语言恢复。
- `src/stores`：Zustand preferences store，带 hydration 等待。
- `src/services/api.ts`：项目自有请求客户端。
- `src/config`：环境、QueryClient、主题、Reactotron。
- `src/lib/initialize-app.ts`：启动任务编排。

整体链路是：

```text
create-expo-app default@sdk-N
        ↓
生成项目（拥有 app.json / package.json / src）
        ↓
src/app 薄路由 → src/pages 页面实现 → src/services/api → 后端
        ↓
src/providers → expo-template-kit 的 Provider / UI / hooks
```

这个分层方向是对的：**共享包只放稳定能力，项目拥有路由、页面、业务状态和配置**。

---

# 二、Q1：路由守卫与防连点

## 1. 路由守卫：当前基本没有

模板里只有三类“类守卫”能力：

| 能力         | 现状                                                    |
| ------------ | ------------------------------------------------------- |
| 启动门禁     | `useAppReady`，启动任务未完成前不渲染路由               |
| 路由错误恢复 | 根布局 `ErrorBoundary` + `AppErrorView`                 |
| 404          | `+not-found.tsx`                                        |
| Overlay 清理 | `useOverlayGuard`，路由变化时关闭浮层，**不是路由守卫** |

真正缺的是：

- 登录态守卫：`authenticated / unauthenticated / loading`
- 角色/权限守卫
- 401 自动刷新 Token、刷新失败回登录
- 未保存表单离开确认
- 深链登录后回跳 `returnTo`
- 路由重复 push / 连续返回
- Android 返回键确认退出
- 登出时清理 Query 缓存、Zustand、Overlay、Loading

### 建议补齐的完整方法

**1）认证状态层**

```ts
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

useAuth(): {
  status: AuthStatus;
  user: User | null;
  login: (credentials) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
};
```

职责：

- 启动时从 SecureStore 恢复 Token。
- 提供 `status` 给根布局做守卫。
- `logout` 统一清理：Token、用户信息、QueryClient、业务 store、Overlay。

**2）根路由守卫**

优先使用 Expo Router 官方的 `Stack.Protected guard={...}`，不要在页面里到处写 `Redirect`：

```tsx
<Stack.Protected guard={status === 'authenticated'}>
  <Stack.Screen name="(app)" />
</Stack.Protected>
<Stack.Protected guard={status === 'unauthenticated'}>
  <Stack.Screen name="(auth)" />
</Stack.Protected>
```

认证状态为 `loading` 时保持启动屏或骨架，避免“先闪登录页再跳首页”。

**3）命令式权限守卫**

```ts
useRequireAuth(): {
  requireAuth: (action: () => void, options?: { returnTo?: string }) => void;
};

useAccessGuard(): {
  can: (permission: string) => boolean;
  requireAccess: (permission: string, action: () => void) => void;
};
```

用于按钮点击、扫码、跳转前的二次校验，而不是只依赖页面级守卫。

**4）401 统一处理**

在 `src/services/api.ts` 注册：

- 请求拦截器附加 Token。
- 响应 401：单飞刷新 Token，只允许一个刷新请求并发。
- 刷新成功：重放原请求一次。
- 刷新失败：清空认证状态，跳转登录页。
- 刷新接口自身 401 不再重试。
- 登出时 `queryClient.clear()`，避免旧用户数据残留。

**5）未保存离开守卫**

```ts
useUnsavedChangesGuard({
  when: isDirty,
  title,
  message,
  confirmText,
  cancelText,
});
```

底层使用 React Navigation 的 `usePreventRemove`。需要显式声明 `@react-navigation/native` 依赖，避免依赖 Expo Router 的幽灵依赖。Android 物理返回键也要走同一套确认逻辑。

**6）导航去重**

```ts
useAppRouter(): {
  pushOnce: (href: Href, options?: { windowMs?: number }) => void;
  replaceOnce: (href: Href, options?: { windowMs?: number }) => void;
  backOnce: () => void;
};
```

按 `href + params` 做短时间窗去重，并在 `usePathname()` 变化后重置。  
注意：Expo Router 的 `Link` 会绕过 `TouchableWrapper`，所以还需要一个 `AppLink`，内部使用同一套守卫。

**7）深链回跳**

登录页接收 `returnTo`，登录成功后：

- 只允许内部路径，例如以 `/` 开头；
- 拒绝 `//`、`http://`、`https://` 等外部地址；
- 使用 `router.replace(returnTo)`，避免登录页留在返回栈。

**8）登出清理**

建议做成一个 `useLogout`：

```ts
useLogout(): {
  logout: () => Promise<void>;
};
```

统一处理：

- 清 Token / 用户信息；
- `queryClient.clear()`；
- 重置业务 store；
- `hideAllOverlayViews()`；
- `hideLoading()`；
- 跳转登录页。

---

## 2. 防连点：有基础，但不完整

### 已有能力

- `TouchableWrapper` 默认 `mode="throttle"`、`delay=500`，同一个实例 500ms 内不会重复触发。
- 支持 `debounce`、`throttle`、`none` 三种模式。
- 支持 `enableGlobalProtection` 模块级全局防连点。
- `Button` 有 `loading/disabled`，loading 时阻止点击。
- `NavBar` 返回按钮额外做了 500ms 防重。
- `ListRow` 点击也基于 `TouchableWrapper`。

### 当前边界

| 问题                           | 说明                                              |
| ------------------------------ | ------------------------------------------------- |
| 全局防连点默认关闭             | 两个不同按钮可以同时触发，例如“提交”和“支付”      |
| 只有时间窗，没有 in-flight 锁  | 异步请求超过 500ms 后，第二次点击仍可能进入       |
| `Link` / 原生 `Pressable` 绕过 | Expo Router `Link` 不走 `TouchableWrapper`        |
| 没有导航级去重                 | `router.push` 连续调用可能压入多个相同页面        |
| 没有按业务 key 的锁            | 无法表达“同一个支付动作在多个入口互斥”            |
| 没有异步错误处理               | `onPress` 返回 Promise 时，无法自动 pending/error |
| 缺少行为测试                   | 没有 fake timer 测试 debounce/throttle/全局锁     |

### 建议的防连点分层

不要只靠“时间节流”，建议分四层：

**L1：单控件时间节流**  
现有 `TouchableWrapper` 已覆盖。

**L2：业务动作级异步锁**

```ts
useAsyncAction<T>(
  action: () => Promise<T>,
  options?: {
    key?: string;
    lockMs?: number;
    onError?: (error: unknown) => void;
  }
): {
  run: () => Promise<T | undefined>;
  pending: boolean;
  error: unknown;
};
```

特点：

- `pending` 为 true 时直接忽略重复调用。
- `finally` 释放锁，不依赖固定时间。
- `key` 支持跨组件互斥，例如 `pay-order`。
- `lockMs` 作为兜底，防止 Promise 永远不结束。
- 卸载时不再 setState。

使用方式：

```tsx
const { run, pending } = useAsyncAction(submitOrder, { key: 'submit-order' });

<Button label="提交" loading={pending} onPress={() => void run()} />;
```

**L3：导航去重**

`useAppRouter.pushOnce / replaceOnce / backOnce`，按目标路由做短时间窗去重。

**L4：请求幂等**

支付、下单、领券等接口增加 `idempotencyKey`，服务端按 key 去重。  
客户端锁只能防 UI 连点，不能防网络重试、离线重放和多端并发。

### 建议补的 API

- `useAsyncAction`
- `usePressLock(key, { windowMs })`
- `useAppRouter`
- `AppLink`
- `useBackGuard`
- `Button` 支持 async `onPress` 或显式 `autoLoading`
- `request` 支持 `idempotencyKey`
- `Toast` 支持队列，避免连续操作时前一个提示被覆盖

---

# 三、Q2：组件缺口

当前 UI Kit 是“最小可用集”，并且 README 明确要求“至少两个稳定使用点才提升为共享组件”。这个克制是对的，不应把所有业务组件都塞进包。  
但从“快速开发”角度，以下组件缺口最明显。

## 1. 高优先级 P0

| 类别          | 当前                                                 | 建议补充                                                                                                 |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 确认/操作菜单 | Overlay 只有底层 Modal/Sheet/Popover，确认弹窗要手写 | `confirm()`、`alert()`、`showActionSheet()`，返回 Promise/选择结果                                       |
| 列表          | 只有 `BasePage` 的 ScrollView                        | `PageList` / `DataList`：FlatList/FlashList + loading/empty/error/offline + 下拉刷新 + 上拉加载 + 分隔线 |
| 表单控件      | Input、FormField                                     | Checkbox、Radio、Switch、SegmentedControl、Select/Picker、DatePicker、SearchBar、PasswordInput、Stepper  |
| 骨架屏        | 只有 Spinner                                         | Skeleton/Shimmer，列表、卡片、详情页占位                                                                 |
| 展示          | ListRow、Divider                                     | Card、PressableCard、Badge/Tag/Chip、Avatar、ProgressBar                                                 |
| 图片          | 直接使用 expo-image                                  | `AppImage`：placeholder、error fallback、cache policy、aspectRatio、blurhash                             |
| 全局离线提示  | 只有页面级 OfflineView                               | 全局 OfflineBanner，配合 `useNetworkStatus`                                                              |
| 表单操作区    | 无                                                   | FormActions、FormErrorSummary、KeyboardToolbar                                                           |

其中**列表容器**可能是最大的缺口。当前 `BasePage` 只支持 ScrollView，长列表、分页、下拉刷新、空态、错误态都需要每个项目重写。

## 2. 中优先级 P1

- Tabs / SegmentedTabs
- Accordion / Collapsible
- 高级 BottomSheet（snap points、拖拽手势）
- SwipeableRow
- Toast 队列、带 action 的 Toast
- `PageStatusView` 支持空态行动按钮、错误态自定义标题/操作
- NavBar 大标题、搜索框、透明背景、滚动折叠
- Input 增强：密码显隐、字符计数、前后缀、格式化/掩码
- `ListRow` 支持 disabled/loading、右侧操作、滑动菜单
- LanguageSwitcher / ThemeSwitcher

## 3. 低优先级 P2

- OTP 输入框
- Slider / NumberInput
- Calendar / 日期区间
- ImageViewer / Carousel
- QR 扫描
- DragSort
- RichText / Markdown
- 组件厨房水槽页（Component Gallery）

## 4. 现有组件的具体问题

这些不是“缺组件”，但会影响快速开发体验：

| 文件                                                         | 问题                                                                                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui-kit/list-row/index.tsx`                   | 硬编码 `minHeight: 52`、标题 16、详情 14；`theme-ui.ts` 里的 `listRow.minHeight`、`typography.listTitle/listDetail` 实际没有被使用 |
| `src/components/ui-kit/loading/index.tsx`                    | 文案字号硬编码 14；`typography.loading` token 没有生效                                                                             |
| `src/components/ui-kit/input/index.tsx`                      | `handleClear` 只调用 `onChangeText('')`；非受控 `defaultValue` 场景下视觉上不会清空                                                |
| `src/components/page-kit/error-view/index.tsx`               | 直接展示 `error.message`，服务端英文/技术错误会暴露给用户，缺少本地化映射                                                          |
| `src/components/ui-kit/toast/index.tsx`                      | 单例 Toast，`showToast` 会关闭上一个，没有队列                                                                                     |
| `src/components/ui-kit/loading/index.tsx`                    | `showLoading` 是全局单例，没有引用计数；多个并发请求会互相覆盖                                                                     |
| `src/components/ui-kit/button/index.tsx`                     | 基础宽度固定 `100%`，没有 inline/auto width 模式                                                                                   |
| `src/components/page-kit/empty/index.tsx`                    | `safeAreaFrame.height / 2 - 240` 是魔法数，小屏/大屏容易偏移                                                                       |
| `src/components/ui-kit/animated-touchable-wrapper/index.tsx` | 从 `react-native-gesture-handler/lib/typescript/...` 深层导入类型，跨版本很脆弱                                                    |
| `src/components/page-kit/base-page/index.tsx:148`            | lint 提示 `useCallback` 缺少 `refreshNetworkStatus` 依赖                                                                           |

## 5. 组件应该放在哪一层

建议继续坚持现有边界，不要把所有东西都放进共享包：

| 层级                             | 放什么                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `expo-template-kit`              | 稳定、跨产品复用、无业务语义的原子组件：Button、Input、FormField、ListRow、Overlay、Toast、Loading、PageList |
| `template/src/components`        | 应用级组合：AppLink、AuthGuard、ConfirmDialog、OfflineBanner、FormActions、SearchBar                         |
| `src/pages/<feature>/components` | 只服务一个业务场景的组件：订单卡片、筛选面板、商品行                                                         |

这样既补齐快速开发能力，又不会把业务组件污染到共享包。

---

# 四、Q3：方法与文档缺口

## 1. 方法缺口

| 领域      | 建议补充的方法                                                                             | 优先级 |
| --------- | ------------------------------------------------------------------------------------------ | ------ |
| 鉴权      | `AuthProvider`、`useAuth`、`useRequireAuth`、`useAccessGuard`、`useLogout`                 | P0     |
| 异步/防重 | `useAsyncAction`、`usePressLock`、`useAppRouter`、`useBackGuard`                           | P0     |
| 错误处理  | `normalizeError`、`getErrorMessage(error, t)`、`isAuthError`、`isRetryable`                | P0     |
| 监控      | `ErrorReporter` 接口、`setErrorReporter`、`setUser`、全局 JS 错误/未处理 Promise 捕获      | P0     |
| 列表/分页 | `queryKeys`、`usePaginatedQuery`、`useInfiniteList`、`PageList`                            | P0     |
| 表单      | `useForm` 或 React Hook Form + Zod 适配、`useDirtyForm`、表单错误汇总                      | P0     |
| 存储      | `createStorage`、SecureStore 封装、持久化版本与迁移                                        | P1     |
| 设备/权限 | `usePermission`、`useAppInfo`、`useShare`、`useHaptics`、打开系统设置                      | P1     |
| 日期/数字 | `formatDate`、`formatCurrency`、`formatNumber`                                             | P1     |
| 启动      | `useAppReady` 超时、任务注册表、启动进度、错误重试退避                                     | P1     |
| 查询      | Query 持久化、离线优先、乐观更新 helper、重试谓词                                          | P1     |
| 测试      | `renderWithProviders`、请求/网络/主题/i18n mock                                            | P1     |
| CLI       | `template:new page/component/store`、`template:check`、`doctor --json`、`update --dry-run` | P1     |
| 分析      | 页面曝光、事件埋点、用户属性                                                               | P2     |
| 推送/OTA  | Expo Notifications、expo-updates、EAS 配置                                                 | P2     |

### 重点问题 1：监控无法替换

`src/services/monitoring/error-reporting.ts` 里的 `ErrorReporter` 类型没有导出，`initErrorReporting()` 也不接收参数，内部固定使用 logger reporter。

这意味着文档虽然说“产品监控 SDK 放在项目边界”，但实际上项目**没有公开入口**接入 Sentry/Bugsnag。  
建议增加：

```ts
export interface ErrorReporter {
  init: (options?: Record<string, unknown>) => void;
  captureException: (error: unknown, context?: ErrorReportingContext) => void;
  captureMessage: (message: string, level?: string, context?: ErrorReportingContext) => void;
  setUser?: (user: { id?: string; [key: string]: unknown } | null) => void;
  addBreadcrumb?: (breadcrumb: Record<string, unknown>) => void;
}

export function setErrorReporter(reporter: ErrorReporter): void;
```

同时补全局错误处理：

- `ErrorUtils.setGlobalHandler`
- Web `unhandledrejection`
- React Query 的 query/mutation 错误
- 请求错误默认是否上报要可配置，避免业务错误刷屏

### 重点问题 2：错误没有本地化模型

现在 `ErrorView` 直接显示 `error.message`，`RequestError` 的消息也是英文技术文案。  
建议增加：

```ts
type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'cancel'
  | 'http'
  | 'business'
  | 'unknown';

normalizeError(error: unknown): {
  kind: AppErrorKind;
  code?: string;
  status?: number;
  message: string;
  userMessageKey: string;
};
```

再配合 `useErrorMessage()` 或 `getErrorMessage(error, t)`，把错误码映射到本地化文案。

### 重点问题 3：全局 Loading 并发不安全

`showLoading/hideLoading` 是全局单例。两个请求同时展示 Loading 时，任意一个调用 `hideLoading()` 都会把另一个也关掉。  
建议：

- `showLoading({ key })` 返回 `hide`；
- 按 key 引用计数；
- `hideLoading(key?)` 只关闭指定 key；
- `withLoading(promise, options)` 包装异步任务；
- Toast 增加队列或“替换/排队”策略。

### 重点问题 4：Query 默认重试策略

`createDefaultQueryClient` 当前 `retry: 1` 对所有错误生效，包括 401、403、404 和业务错误。  
建议：

```ts
retry: (failureCount, error) => failureCount < 1 && isRetryable(error);
```

只重试网络错误、超时和 5xx，不重试鉴权错误和业务错误。

### 重点问题 5：缺少页面生成器

AGENTS 定义了严格的页面契约，但 CLI 只有创建项目、升级、doctor、use-local。  
建议增加：

```bash
template:new page order-detail
template:new component order-card
template:new store use-cart-store
template:new api order
```

自动生成：

```text
src/pages/order-detail/
├── index.tsx
├── index.logic.ts
├── index.api.ts
├── index.type.ts
└── components/
```

并自动创建 `src/app/order-detail.tsx` 薄路由。  
这对“快速开发”的提升会非常直接。

## 2. 文档缺口

### 缺“黄金路径”示例

当前 `home` 页面是静态的，没有完整展示：

- React Query 请求
- 列表分页/下拉刷新
- 表单提交
- 错误/空态/离线态
- Toast 反馈
- i18n
- 路由跳转
- 防连点

建议新增一篇 `docs/golden-path-crud.md`，给出一个可复制的完整 CRUD 页面。  
这比增加十个组件更能提升上手速度。

### 缺架构总览

README 目前更像“安装 + 版本变更记录”，不是架构文档。建议拆成：

- `README.md`：10 分钟快速开始、能力矩阵、目录结构。
- `docs/architecture.md`：分层、依赖方向、Provider 顺序、数据流。
- `docs/decision-tree.md`：状态放哪里、组件放哪里、请求放哪里。
- `CHANGELOG.md`：版本记录；README 不再堆迁移说明。

### 缺专题文档

建议补齐：

- 鉴权与路由守卫
- 防连点与异步提交
- 错误模型与用户提示
- React Query 约定：query key、失效、乐观更新、分页
- Zustand 约定：持久化、hydration、登出重置、版本迁移
- 表单与校验
- 存储与 SecureStore
- 权限、相机、通知、定位
- 深链与 `returnTo`
- EAS Build / EAS Update
- 测试与 mock
- 性能：FlashList、图片缓存、Hermes、包体积
- 新 SDK 接入检查清单

### 文档一致性问题

目前有几处明确冲突，建议优先修：

| 位置                                         | 问题                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docs/generated-project-usage.md:107`        | 说 `useThemeColor` 会自动识别自定义 token，但根入口没有导出 `useThemeColor`                        |
| `README.md:144`                              | 说 `useThemeColor` 已移除，与上一条冲突                                                            |
| `AGENTS.md:248/257/266`                      | 写死 “Expo SDK 56 / Expo v56 docs”，但该文件会被复制到所有生成项目，SDK 54/57 项目也会看到错误指引 |
| `src/components/ui-kit/overlay/README.md:14` | 写死 “Expo SDK 56、React Native 0.85、Reanimated 4”，对 54/57 不准确                               |
| `docs/generated-project-usage.md:164`        | 写死 keyboard-controller `1.22.5` 和 SDK 57，后续必然漂移                                          |
| `README.md`、`docs/template-contribution.md` | 多处写死 SDK 54/56/57，新增 SDK 时要手工改很多地方                                                 |

---

# 五、Q4：当前架构能否支撑每个新 Expo 版本？

## 结论

**能支撑“新增一个 Expo SDK 版本”，但不能自动支撑“每个未来版本”。**

更准确地说：

- **代码层是 SDK 无关的**：共享包主要是 TS/JS，原生依赖交给 `expo install` 解析，模板是源码复制，不绑定 RN 版本。
- **发布层是 SDK 白名单的**：`supportedExpoSdks`、peer range、CLI help、README、AGENTS、Overlay 文档都写死了 54/56/57。
- **验证层是偏弱的**：`verify:matrix` 只做 Web 导出，没有 iOS/Android 原生构建，也没有 CI。
- **原生依赖是最大风险**：`react-native-splash-screen-newarch`、Reactotron、Backstage 都是固定版本，未来 SDK/RN 升级可能不兼容。

所以当前状态是：**“可扩展，但每次都要人工发版 + 人工验证”，不是“自动跟随”。**

## 当前支撑新版本的机制

这些设计是好的：

1. `create-expo-app --template default@sdk-N` 让 Expo 决定 React/RN 版本。
2. `expo install` 安装 Expo 模块，自动匹配 SDK。
3. 共享包不打包原生代码，原生模块作为 peer dependency。
4. 模板是源码，生成后归项目所有，升级不覆盖业务代码。
5. 有 `verify:matrix`，能生成多个 SDK 项目并做 typecheck/lint/web export。
6. `update` 会执行 `expo install --fix` 和 `expo-doctor`。

## 当前阻碍“未来版本”的硬编码点

| 位置                                                         | 硬编码/假设                                                                                                          | 影响                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `package.json`                                               | `supportedExpoSdks: [54, 56, 57]`                                                                                    | 新 SDK 必须改这里                                                       |
| `package.json`                                               | `expo >=54 <58`、`expo-router >=6 <58`、`expo-image >=3 <58`、`expo-network >=8 <58`                                 | SDK 58 安装时 peer 不满足                                               |
| `package.json`                                               | `react >=19 <20`、`react-native >=0.81 <0.87`                                                                        | React 20 / RN 0.87 会被挡住                                             |
| `scripts/template-cli.mjs`                                   | help 文本 `--sdk 54                                                                                                  | 56                                                                      | 57` | 新 SDK 帮助信息错误 |
| `scripts/template-cli-core.mjs`                              | `create-expo-app@latest`、`default@sdk-N`                                                                            | 生成器行为不可复现；未来 CLI 参数可能变                                 |
| `scripts/template-cli-core.mjs`                              | `configureExpoApp` 假设存在 `app.json`，并删除 `app`/`src`                                                           | 未来默认模板若改成 `app.config.ts` 或目录变化会失败                     |
| `scripts/template-cli-core.mjs`                              | `npmPackages` 固定 `react-native-splash-screen-newarch@2.2.0`、`reactotron-react-native@5.3.1`、`rn-backstage@1.5.4` | 新 RN/SDK 可能不兼容                                                    |
| `scripts/verify-sdk-matrix.mjs`                              | 只跑 Web export                                                                                                      | 原生模块兼容性未验证                                                    |
| `AGENTS.md`                                                  | 写死 SDK 56，且会被复制到每个生成项目                                                                                | 54/57/58 项目的 AI 指引错误                                             |
| `README.md` / `docs`                                         | 多处写死 54/56/57、SDK 57、keyboard 1.22.5                                                                           | 文档漂移                                                                |
| `src/components/ui-kit/animated-touchable-wrapper/index.tsx` | 深层导入 `react-native-gesture-handler/lib/typescript/...`                                                           | RNGH 内部结构变化会直接编译失败                                         |
| `src/index.ts`                                               | 根入口 `export *` 所有 UI                                                                                            | 导入 logger/request 也会拉入 UI 原生依赖，optional peer 实际不 optional |
| `docs/template-release-and-upgrade.md`                       | 固定使用 `react-native-splash-screen-newarch`，明确不建议 `expo-splash-screen`                                       | 官方闪屏模块随 SDK 升级，第三方模块可能滞后                             |
| 仓库                                                         | 无 `.github/workflows`                                                                                               | 新 SDK 验证依赖人工                                                     |

## 建议的目标架构

### 1）单一 SDK 清单 `sdk-manifest.json`

把所有版本信息集中到一处：

```json
{
  "54": {
    "status": "maintenance",
    "expoTemplate": "default@sdk-54",
    "peerRanges": { "expo": ">=54 <55", "react-native": ">=0.81 <0.82" },
    "nativePins": {}
  },
  "57": {
    "status": "current",
    "expoTemplate": "default@sdk-57",
    "peerRanges": { "expo": ">=57 <58", "react-native": ">=0.83 <0.84" }
  },
  "58": {
    "status": "preview",
    "expoTemplate": "default@sdk-58"
  }
}
```

再由脚本生成：

- `package.json` 的 `supportedExpoSdks`
- peer dependency 范围
- CLI help
- README 支持矩阵
- `AGENTS.md` 中的 SDK 版本
- `verify:matrix` 的默认列表

这样新增 SDK 不再是“全局搜索替换”。

### 2）按 SDK 分层的模板

有两种做法：

- **推荐**：`template/base` + `template/sdk/<sdk>` 覆盖层。SDK 差异只放在覆盖层，公共页面/Provider 不变。
- 或者保持单模板，但所有 SDK 相关文本/版本从 manifest 注入。

至少要把 `AGENTS.md`、README 片段、`app.json` 插件、原生依赖版本参数化。

### 3）原生依赖适配层

- 闪屏：优先评估官方 `expo-splash-screen`；如果必须用 `react-native-splash-screen-newarch`，封装成 `splash-screen` adapter，并提供 fallback。
- 图标：封装 `AppIcon`，不要让所有组件直接依赖 `@expo/vector-icons` 的 `Ionicons`。
- 键盘：封装在 `BasePage`，但要跟踪 `react-native-keyboard-controller` 的破坏性变更。
- Reactotron / Backstage：只在开发环境动态导入，生产构建不进入主依赖图。
- 如果某个原生模块不兼容新 SDK，模板仍能启动，只是对应能力降级。

### 4）根入口拆子路径

建议增加 subpath exports：

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./request": "./src/utils/request.ts",
    "./logger": "./src/utils/logger.ts",
    "./theme": "./src/constants/theme.ts",
    "./page-kit": "./src/components/page-kit/index.ts",
    "./ui-kit": "./src/components/ui-kit/index.ts"
  }
}
```

好处：

- 只用 request/logger 的项目不需要安装 UI 原生依赖。
- optional peer 才真正 optional。
- 新 SDK 的 UI 破坏性变更不会影响纯请求/日志使用方。

### 5）CI 矩阵 + 原生构建

`verify:matrix` 目前只做 Web。建议扩展为：

```text
每个 SDK：
  create project
  expo-doctor
  tsc --noEmit
  lint
  unit tests
  expo export --platform ios/android/web
  expo prebuild --clean
  iOS xcodebuild / Android gradle assembleRelease
  Maestro 冒烟：启动、首页、主题切换、语言切换、Overlay、表单、离线态
```

再加一个 `sdk:next` / canary job，提前发现下个 SDK 的破坏性变更。

### 6）新增 SDK 的标准流程

1. 在 `sdk-manifest.json` 登记新 SDK，状态设为 `preview`。
2. 用固定版本的 `create-expo-app` 创建样例项目。
3. 跑 `expo-doctor`、`tsc`、`lint`、单测。
4. 跑 `expo prebuild` + iOS/Android 原生构建。
5. 检查原生模块：闪屏、键盘、Reanimated、Gesture Handler、Safe Area、Image、Network、Router。
6. 修正模板中的 API 变更。
7. 由 manifest 生成 AGENTS/README/文档。
8. 全矩阵通过后发布新 Tag，再把默认 SDK 切到新版本。
9. 业务项目按迁移文档执行 `template:update` + `expo install --fix` + 原生重构建。

### 7）支持策略建议

不要承诺“每个版本永远支持”，建议明确窗口：

- `preview`：下一个 SDK，提前适配，不承诺稳定。
- `current`：默认创建版本，完整测试。
- `maintenance`：前 1-2 个版本，只修 bug。
- `eol`：停止支持，文档给出升级路径。

例如：默认 57，维护 56/54，预览 58。  
新增 SDK 的目标应是“发布后 1-2 周内可创建”，而不是“自动支持所有未来版本”。

### 8）`doctor` 的行为

当前 `doctor` 发现未知 SDK 会直接失败。建议改成：

- 低于最低支持版本：失败，提示最低版本。
- 高于最高支持版本：警告，提示“当前模板尚未验证 SDK N，请升级模板或使用 --sdk 57”。
- 缺少模板依赖：失败，提示安装命令。
- peer 冲突/native 重复：输出具体包名和修复建议。
- 增加 `--json`，方便 CI。

---

# 六、建议落地顺序

## P0：先补齐“业务闭环”

1. 鉴权与路由守卫：`AuthProvider`、`Stack.Protected`、401 刷新、登出清理。
2. 异步防重：`useAsyncAction`、`usePressLock`、`useAppRouter`、`AppLink`。
3. 列表容器：`PageList` / `DataList`，支持刷新、分页、空/错/离线态。
4. 表单控件：Checkbox、Radio、Switch、SegmentedControl、Select、DatePicker、SearchBar。
5. 反馈高层封装：`confirm`、`actionSheet`、Skeleton、keyed Loading、Toast 队列。
6. 错误模型：`normalizeError`、`getErrorMessage`、监控 `setErrorReporter`。
7. 黄金路径文档：一个完整 CRUD 页面示例。

## P1：模板工程化

1. `sdk-manifest.json` + 文档生成。
2. CI 矩阵 + iOS/Android 原生构建 + 冒烟测试。
3. `template:new page/component/store` 生成器。
4. `template:check` 页面契约检查。
5. 存储/SecureStore、权限、日期格式化、测试工具。
6. Query key/分页/乐观更新约定。

## P2：生态扩展

1. 高级组件：OTP、Calendar、Carousel、SwipeableRow、DragSort。
2. 埋点、推送、OTA、EAS 配置。
3. 组件厨房水槽/Storybook。
4. 性能与包体积分析。

---

# 七、当前检查结果

本轮没有修改任何文件，只做了静态梳理和现有检查：

- `npm run typecheck`：通过。
- `npm run lint`：0 error，1 warning：
  - `src/components/page-kit/base-page/index.tsx:148` 的 `useCallback` 缺少 `refreshNetworkStatus` 依赖。
- `npm test`：22 个测试全部通过。

整体评价：**基础架构合格，业务快速开发能力不足；多 SDK 方向正确，但需要从“人工白名单”升级为“manifest + 适配层 + CI 矩阵”的可重复流程。**

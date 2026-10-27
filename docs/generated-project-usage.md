> 本仓库已迁至 GitHub，当前基线为 SDK 58。尚无已发布 Tag；安装与目录结构以根 README 为准。

# 生成项目使用说明

本文说明哪些代码归项目所有、如何覆写模板配置，以及哪些能力应继续从
`expo-template-kit` 使用。

## 所有权边界

| 位置                                    | 所有者 | 使用原则                                                            |
| --------------------------------------- | ------ | ------------------------------------------------------------------- |
| `expo-template-kit`                     | 模板包 | UI、主题上下文、request、logger、监控和启动生命周期只有一个实现来源 |
| `src/i18n`、`src/stores`                | 项目   | 按产品语言、偏好字段和持久化规则直接修改                            |
| `src/config/environment.ts`             | 项目   | 统一读取公开环境变量并导出环境判断、开关和项目配置                  |
| `src/app`、`src/pages`、`src/providers` | 项目   | 路由、页面和全局 Provider 组合不会被模板升级覆盖                    |
| `src/components`                        | 项目   | 放置至少跨两个页面稳定复用、但仍带项目语义的组件                    |

页面私有组件继续放在 `src/pages/<feature>/components`，不要因为目录已存在就提前
提升到 `src/components`。

## 多语言

基础配置位于 `src/i18n/index.ts`，语言资源位于 `src/i18n/locales`。页面使用：

```tsx
import { useTranslation } from 'react-i18next';

export function Example() {
  const { t } = useTranslation();
  return <Text>{t('example.title')}</Text>;
}
```

新增语言时完成四步：

1. 在 `src/i18n/locales` 新增资源文件。
2. 将语言代码加入 `supportedLanguages`。
3. 在 i18next `resources` 中注册该资源。
4. 扩展 `normalizeLanguageTag` 和语言选择 UI。

所有语言文件必须保持 key 对齐。UI Kit 使用 `common.clearInput`、
`common.error_message`、`common.error_title`、`common.loading`、
`common.loading_more`、`common.network_error`、`common.no_data`、`common.no_more`、
`common.retry` 和 `common.retry_load`。可以覆写值；删除 key 时必须向对应组件传入替代文案。

切换语言通过项目 preferences store：

```ts
const setLanguage = usePreferencesStore(state => state.setLanguage);
await setLanguage('en');
```

## 主题与偏好状态

`src/stores/use-preferences-store.ts` 是项目状态，可增加产品需要的持久化偏好。
`src/config/theme.ts` 是项目拥有的颜色配置入口；分别在 `light` 和 `dark` 中覆盖需要的
token，未写的 token 保留模板默认值。`AppThemeProvider` 会将偏好主题与这份配置传给
共享 `ThemeProvider`，因此共享组件和业务页面使用相同颜色：

```ts
import { type ThemeConfig } from 'expo-template-kit';

declare module 'expo-template-kit' {
  interface AppThemeColorTokens {
    secondary: string;
    brandAccent: string;
  }
}

export const theme = {
  colors: {
    light: {
      primary: '#2563EB',
      background: '#FFFFFF',
      secondary: '#64748B',
      brandAccent: '#E11D48',
      overlay: 'rgba(0, 0, 0, 0.48)',
    },
    dark: {
      primary: '#60A5FA',
      background: '#0F172A',
      secondary: '#CBD5E1',
      brandAccent: '#FB7185',
      overlay: 'rgba(0, 0, 0, 0.64)',
    },
  },
} satisfies ThemeConfig;
```

自定义 token 在 `AppThemeColorTokens` 中声明一次。声明后，`light` 与 `dark` 都必须为每个扩展
token 提供值，避免系统切换主题后得到 `undefined`。

可用 token 为 `text`、`background`、`backgroundElement`、`backgroundSelected`、`surface`、
`textSecondary`、`textTertiary`、`textDisabled`、`primary`、`icon`、`border`、`success`、
`warning`、`danger` 和 `overlay`。业务读取颜色或当前实际主题：

```ts
import { ThemedText, useTheme, useThemeName } from 'expo-template-kit';

const theme = useTheme();
const themeName = useThemeName(); // "light" | "dark"

theme.secondary;
theme.brandAccent;

<ThemedText themeColor="secondary">Brand copy</ThemedText>;
```

`useTheme()`、`ThemedText` 和 `ThemedView` 会自动识别已声明的自定义 token。
不要将颜色类型放宽为任意字符串；未注册的 token 会保持 TypeScript 报错，以避免拼写错误。

`setTheme("light")` 与 `setTheme("dark")` 固定主题；`useSystemTheme()` 跟随系统。
不要在页面中再初始化第二个主题 Provider 或 preferences store，也不要修改 `node_modules`
中的 `Colors`。

## 网络状态与页面状态

生成项目在根层挂载唯一的 `NetworkStatusProvider`，使用 Expo SDK 自带的 `expo-network`
监听网络变化，并在应用回到前台时重新读取状态。`useNetworkStatus` 读取这份全局状态，
返回原始 `networkState`、`isConnected`、`isInternetReachable`、`isOffline` 和手动刷新的
`refresh`。`isOffline` 只会在设备明确断网或明确无法访问互联网时为 `true`；状态未知时保持
`false`：

```tsx
import { useNetworkStatus } from 'expo-template-kit';

const { isOffline, refresh } = useNetworkStatus();
```

读取失败时网络状态为 `null`，错误会通过共享 logger 记录。用户重试前可主动刷新：

```tsx
const { refresh } = useNetworkStatus();

await refresh();
await retryRequest();
```

`BasePage` 不监听网络，也不会根据设备网络状态自动显示离线页。页面逻辑应只在请求失败且
没有可展示内容时显式传入 `pageStatus="offline"`，以保留缓存内容并避免请求中的离线状态闪烁。

## 应用生命周期

生成项目的根层已挂载唯一的 `AppLifecycleProvider`。需要根据前后台状态暂停页面轮询或
恢复局部任务时，读取全局状态，不要在页面中重复订阅 `AppState`：

```tsx
import { useAppLifecycle } from 'expo-template-kit';

const { appState, isActive } = useAppLifecycle();
```

`statusViewStyle` 只作用于 `BasePage` 的状态视图，不会包裹或改变正常页面内容布局。

## FlashList 列表

列表页面使用共享 `PageList`。它内部复用 `BasePage`，负责导航栏、安全区、键盘避让和
整页状态，同时提供下拉刷新、分页触底、加载更多、无更多和空态：

```tsx
import { PageList } from 'expo-template-kit';

<PageList
  data={items}
  keyExtractor={item => item.id}
  renderItem={({ item }) => <OrderCard order={item} />}
  refreshing={query.isRefetching}
  onRefresh={query.refetch}
  loadingMore={query.isFetchingNextPage}
  hasMore={query.hasNextPage}
  onEndReached={() => void query.fetchNextPage()}
/>;
```

分页状态由页面 `index.logic.ts` 或 React Query 持有，`PageList` 在 `loadingMore`、
`hasMore === false` 或列表为空时不会重复触发 `onEndReached`。列表页面不要再嵌套
`ScrollView`；需要页头、页尾时分别使用 `listHeaderComponent`、`listFooterComponent`。
`listProps` 可透传高级 FlashList 配置。

依赖版本由目标 Expo SDK 的 `bundledNativeModules.json` 决定，而不是 npm `latest`：
当前 SDK 58 使用 `2.3.2`。这样 Expo Go、原生构建和 JS
代码保持一致。需要覆盖版本时，先确认目标 SDK 与 Expo Go 是否包含同一原生实现。

## 键盘处理

生成项目的 `AppProviders` 已挂载 `KeyboardProvider`。`BasePage` 默认使用
`react-native-keyboard-controller`：可滚动页面使用 `KeyboardAwareScrollView`，静态页面
使用其 `KeyboardAvoidingView`。包含输入框的普通页面无需额外配置；需要自行控制键盘
布局的页面可关闭默认行为：

```tsx
<BasePage keyboardAware={false}>{children}</BasePage>
```

该库由生成器通过 Expo CLI 安装，具体版本取决于目标 SDK（SDK 58 为 `1.22.7`，
其他 SDK 可能不同）。新项目默认通过 Expo SDK 58 创建，Expo 负责解析兼容版本。
安装或升级后，原生 iOS/Android 项目应重新构建，以使原生模块进入开发和发布构建。

## 响应式布局

布局尺寸只通过包提供的 `useDeviceMetrics` 读取。它会在横竖屏切换、平板分屏、
Android 多窗口、折叠屏窗口变化和系统字体缩放时更新：

```tsx
import { useDeviceMetrics } from 'expo-template-kit';

export function Example() {
  const { screenWidth, contentHeight, fontScale, isLandscape } = useDeviceMetrics();

  return <Content width={screenWidth} height={contentHeight} />;
}
```

常用快捷字段为 `screenWidth`、`screenHeight`、`pixelRatio`、`fontScale`、
`hairlineWidth`、`safeTop`/`safeBottom`/`safeLeft`/`safeRight`、
`contentWidth`、`contentHeight`、`layoutScale`、`isPortrait` 和 `isLandscape`。
`layoutScale` 是最短边相对 375 的受限布局倍率；系统文字缩放请使用 `fontScale`。

不要缓存屏幕尺寸、按机型推断刘海/动态岛，或为状态栏、导航栏和 Tab Bar 使用固定高度；
使用 `safeAreaInsets` 与实际容器布局。需要锁定方向或读取物理方向时，项目可按需安装
并使用 `expo-screen-orientation`；常规响应式页面不需要该依赖，也不需要 `expo-device`。

`BottomTabInset` 已弃用但仍保留兼容导出。不要再用它为页面预留固定底部高度；应组合
`useSafeAreaInsets` 与导航库或实际 Tab Bar 的布局尺寸。

## Request、Logger 与监控

请求能力由包实现，项目客户端由 `src/services/api.ts` 配置。环境变量统一由
`src/config/environment.ts` 读取，因为 Expo 不会把项目的 `EXPO_PUBLIC_*` 内联到
`node_modules`：

```ts
import { api } from '@/services/api';

const profile = await api.get<Profile>('/profile');
```

页面请求继续放在 `index.api.ts`，共享认证或拦截逻辑放在项目 service 层，不要直接
修改包内 request 实现来承载单个产品的接口规则。

调整 base URL、超时或成功码时编辑 `src/services/api.ts`，不要在页面重新创建客户端。
详细的响应、错误、取消与上传约定见[请求客户端](request-client.md)。

### Sentry 监控

生成项目已经把 Sentry 接到共享监控边界，项目侧文件包括：

- `src/config/environment.ts`：读取公开 DSN、环境和采样率。
- `src/config/sentry.ts`：初始化 Sentry，并向共享包注册 `ErrorReporter`。
- `src/app/_layout.tsx`：`Sentry.wrap` 包裹根布局，注册导航容器，捕获启动和路由错误。
- `metro.config.js`：通过 `getSentryExpoConfig` 生成 Debug ID，供 release 崩溃符号化。

运行时配置放在项目环境文件中：

```env
EXPO_PUBLIC_SENTRY_DSN=https://public-key@o0.ingest.sentry.io/0
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

`EXPO_PUBLIC_SENTRY_DSN` 为空时不会初始化 Sentry，也不会发送事件。
`EXPO_PUBLIC_SENTRY_ENVIRONMENT` 为空时回退到 `EXPO_PUBLIC_APP_ENV`；采样率必须是
`0` 到 `1` 之间的数字，Development 默认 `1`，其他环境默认 `0`。DSN 是公开写入标识；
`SENTRY_AUTH_TOKEN` 绝不能放进 `EXPO_PUBLIC_*`，也不能提交到仓库。

`app.json` 中的 `@sentry/react-native/expo` 插件负责构建期上传 source map。组织、项目和
Token 从构建环境读取：

```bash
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=...
```

在 EAS Build 中把这三项配置为对应 Environment 的 Secret；本地发布构建也应在命令环境
中注入。自建 Sentry 时修改插件配置的 `url`，并确认上传地址与 DSN 指向同一实例。
上传失败不应阻塞业务启动，但需要在构建日志中排查，否则 release 堆栈无法符号化。

需要替换监控厂商时，在项目侧实现同一个 `ErrorReporter` 接口并调用
`initErrorReporting`，不要在页面中散落 SDK 调用：

```ts
import { initErrorReporting, type ErrorReporter } from 'expo-template-kit';

const reporter: ErrorReporter = {
  init: () => initializeVendor(),
  captureException: (error, context) => captureVendorError(error, context),
  captureMessage: (message, context) => captureVendorMessage(message, context),
};

initErrorReporting(reporter);
```

## 启动任务

`src/lib/initialize-app.ts` 默认等待 i18n 初始化和 preferences hydration。新增必须在
路由显示前完成的任务时，在这里组合：

```ts
export async function initializeApp() {
  await Promise.all([initializeI18n(), waitForPreferencesHydration(), initializeProductRuntime()]);
}
```

共享 `useAppReady(initializeApp)` 负责 ready/error/retry 和闪屏隐藏，不要在页面重复
处理启动生命周期。

## Backstage

`src/providers/development-backstage.tsx` 是项目调试入口。可把项目 store、feature
flags 和 quick actions 传给 `Backstage`。规则如下：

- 未配置开关时，仅开发 bundle 默认显示。
- 显式 `true` 可在批准的诊断构建中开启。
- 显式 `false` 可在开发 bundle 中关闭。

环境变量由 Expo 在打包时内联。修改后先完整 Reload；只有确认 Metro 缓存异常时执行：

```bash
npx expo start --clear
```

## Reactotron

`src/config/reactotron.native.ts` 是项目拥有的 Reactotron 配置，会在根路由加载前运行：

- Development 在 host 留空时从 Metro bundle 地址自动推导电脑地址。
- INT Release 仅在 `EXPO_PUBLIC_REACTOTRON_HOST` 非空时连接。
- Production 和 Web 永不连接。
- console 会在 socket 连接前完成桥接；首屏日志进入发送队列，连接后按原顺序展示。
- `console.warn`/`logger.warn` 和 `console.error`/`logger.error` 保留对应 Reactotron 级别。

INT 真机示例：

```env
EXPO_PUBLIC_REACTOTRON_HOST=192.168.1.20
```

Reactotron Desktop 必须监听默认端口 `9090`。真机需要能访问该电脑局域网 IP；无法连接时
检查手机与电脑是否处于可互通网络，并确认系统防火墙允许 `9090` 入站连接。不要在 INT
Release 中回退到 `localhost`，它会指向设备自身。

要改变 Reactotron 名称、主机或插件选项，直接编辑该项目的
`src/config/reactotron.native.ts`。模板升级不会覆盖这个文件。Web 会自动使用
`src/config/reactotron.web.ts` 的空实现，避免解析原生调试模块。

## 本地环境脚本

生成项目包含 `.env.development`、`.env.int` 和 `.env.production`，每个文件都显式
设置 `EXPO_PUBLIC_APP_ENV`。`.env.template` 只是变量清单，不会被 Expo 自动加载。
只有 `.env.template` 应提交到 Git；其余 `.env*` 文件均为本地配置，已被
`.gitignore` 忽略。新成员应从 `.env.template` 创建自己需要的环境文件。
默认 `start`、`android`、`ios` 使用 Development；可用的额外脚本如下：

```bash
npm run start:int
npm run android:int
npm run ios:int
npm run android:production
npm run ios:production
```

`android:int`/`android:production` 使用 Android Release variant；
`ios:int`/`ios:production` 使用 iOS Release configuration。它们由 `dotenv-cli`
注入对应环境文件，因此不会依赖 Expo 对任意 `.env.<profile>` 文件的自动选择。

配置优先级和默认值：

1. 本地脚本用 `dotenv -o` 注入所选环境文件，其中的值覆盖调用脚本前同名变量。
2. EAS Build 不依赖这些本地脚本；在对应 EAS Environment 或 build profile 中注入同名变量。
3. `EXPO_PUBLIC_APP_ENV` 缺失或无效时，开发 bundle 回退为 `development`，其余回退为
   `production`。
4. Logger 和 Backstage 的显式 `true`/`false` 优先于默认值；Reactotron host 空字符串
   视为未配置。
5. Sentry DSN 为空时关闭监控；Environment 为空时回退到 `EXPO_PUBLIC_APP_ENV`；
   采样率缺失或越界时使用环境默认值。

`EXPO_PUBLIC_*` 会出现在客户端 bundle 中，只能存放公开构建配置，不能存放密钥、Token
或私有凭据。Sentry 的 DSN、环境和采样率属于公开运行配置；`SENTRY_ORG`、
`SENTRY_PROJECT` 和 `SENTRY_AUTH_TOKEN` 只用于构建上传，必须通过 EAS Secret 或构建
环境注入。源码必须使用静态属性访问，统一由 `src/config/environment.ts` 导出。
修改变量后执行完整 Reload；只有缓存表现异常时才使用 `npx expo start --clear`。

## 本地模板联调与升级

联调未发布模板：

```bash
npm run template:use-local -- ../expo-template-kit
npm run typecheck
npm run lint
```

恢复或升级精确 Tag：

```bash
npm run template:update -- 1.0 # 仅在将来创建该 Tag 后使用
```

`template:update` 不会重写项目所有文件。升级 v2.0.0 请先阅读
[v2.0.0 迁移说明](migrations/v2.0.0.md)；升级 v1.0.14 请先阅读
[v1.0.14 迁移说明](migrations/v1.0.14.md)；升级 v1.0.12 请先阅读
[v1.0.12 迁移说明](migrations/v1.0.12.md)；升级 v1.0.11 请阅读
[v1.0.11 迁移说明](migrations/v1.0.11.md)；升级 v1.0.10 请阅读
[v1.0.10 迁移说明](migrations/v1.0.10.md)；升级 v1.0.8 时还应阅读
[v1.0.8 迁移说明](migrations/v1.0.8.md)并手动采用项目请求客户端；从 v1.0.7 或更早版本
升级时还应阅读 [v1.0.7 迁移说明](migrations/v1.0.7.md)和
[v1.0.6 迁移说明](migrations/v1.0.6.md)。

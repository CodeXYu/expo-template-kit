# Expo Template Kit

`expo-template-kit` 是面向 Expo SDK 54、56、57、58 的项目生成器与共享基础包。
新项目拥有路由、页面、i18n、状态和 Provider 组合；稳定的 UI、request、
logger、主题上下文及启动生命周期只保留在模板包，避免同一实现出现两份。

## 创建项目

```bash
npx --yes \
  --package "git+ssh://git@gitee.com/yu-guangji/expo-template-kit.git#v2.0.0" \
  create-rn-expo-app my-app \
  --app-id com.company.myapp
```

默认使用最新支持的 SDK 58。需要固定 SDK 时增加 `--sdk 54`、`--sdk 56`、`--sdk 57`
或 `--sdk 58`。生成器会创建 Expo Router 项目、安装由目标 SDK 解析的兼容依赖、配置
`react-native-splash-screen-newarch` 与 Sentry，并生成以下项目所有结构：

```text
src/
├── app/                         Expo Router 入口
├── components/                  跨页面的项目组件
├── config/
│   ├── environment.ts          项目环境、调试开关与公开运行配置
│   ├── query-client.ts          项目 QueryClient 实例
│   ├── reactotron.native.ts     项目 Reactotron 配置
│   └── sentry.ts                项目 Sentry 初始化与监控适配
├── constants/storage.ts         项目持久化 key
├── hooks/                       项目共享 hooks
├── i18n/
│   ├── index.ts                 i18next 初始化与语言定义
│   └── locales/{en,zh-CN}.ts    可覆写的基础文案
├── lib/initialize-app.ts        项目启动任务编排
├── pages/home/index.tsx         业务页面
├── providers/                   Provider、主题与 Backstage 组合
├── services/api.ts               项目请求客户端与默认参数
├── stores/use-preferences-store.ts
└── utils/                       项目专用工具

metro.config.js                  Sentry Debug ID 与 Metro 配置
```

`components`、`hooks` 和 `utils` 初始只包含 `.gitkeep`。共享实现直接从包导入：

```ts
import {
  BasePage,
  Button,
  PageList,
  createRequestClient,
  logger,
  useTheme,
} from 'expo-template-kit';
```

## i18n 与项目覆写

编辑生成项目中的 `src/i18n/locales/en.ts` 和 `zh-CN.ts` 即可覆写模板文案，
也可以在 `src/i18n/index.ts` 中增加语言或 namespace。UI Kit 默认依赖以下 key：

```text
common.clearInput
common.error_message
common.error_title
common.loading
common.loading_more
common.network_error
common.no_data
common.no_more
common.retry
common.retry_load
```

可以修改这些 key 的值；删除或改名时，必须为对应组件传入替代文案。
完整扩展方式见 [生成项目使用说明](docs/generated-project-usage.md)。

## FlashList 列表容器

`PageList` 基于 `@shopify/flash-list`，内部复用 `BasePage` 的导航栏、安全区、键盘避让
和页面状态，并统一处理下拉刷新、分页触发、加载更多和空态：

```tsx
<PageList
  data={items}
  keyExtractor={item => item.id}
  renderItem={({ item }) => <OrderCard order={item} />}
  refreshing={query.isRefetching}
  onRefresh={query.refetch}
  loadingMore={query.isFetchingNextPage}
  hasMore={query.hasNextPage}
  onEndReached={() => void query.fetchNextPage()}
/>
```

`PageList` 只负责列表呈现和分页防抖，分页状态仍应放在页面逻辑或 React Query 中。
列表页面不要再嵌套外层 `ScrollView`。生成项目通过目标 Expo SDK 的
`bundledNativeModules.json` 安装 FlashList，例如 SDK 58 使用 Expo 验证的
`2.3.2`，而不是直接取 npm `latest`；这样可避免 Expo Go 与原生模块版本不一致。

## 环境配置

生成项目的 `src/config/environment.ts` 是唯一环境入口。Expo 不会把项目中的
`EXPO_PUBLIC_*` 内联到 `node_modules`，因此共享包不直接读取这些变量。页面、Provider
和项目 service 应从该文件导入 `isDev`、`isInt`、`isProd` 及其他项目配置。

本地脚本会分别加载 `.env.development`、`.env.int` 或 `.env.production`；
`.env.template` 仅作为字段清单，不会被 Expo 自动加载。EAS Build 应在对应 EAS
Environment 或 build profile 中配置相同变量。`EXPO_PUBLIC_*` 会进入客户端 bundle，
不得存放密钥、Token 或私有凭据。

Sentry 的项目运行配置同样从 `src/config/environment.ts` 读取：
`EXPO_PUBLIC_SENTRY_DSN` 为空时完全关闭监控；
`EXPO_PUBLIC_SENTRY_ENVIRONMENT` 为空时回退到 `EXPO_PUBLIC_APP_ENV`；
`EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` 接受 `0` 到 `1`，Development 默认 `1`，
其他环境默认 `0`。DSN 是公开的写入标识，但 `SENTRY_ORG`、`SENTRY_PROJECT` 和
`SENTRY_AUTH_TOKEN` 是构建期配置，绝不能加 `EXPO_PUBLIC_` 前缀或写入仓库。

生成项目仅提交 `.env.template`；`.env.development`、`.env.int` 和
`.env.production` 都是本地环境文件，已由 `.gitignore` 忽略。首次使用时从
`.env.template` 创建所需环境文件，再填入本机或目标环境的公开配置。

所有页面 API 通过生成项目的 `@/services/api` 使用。该文件集中配置 base URL、30 秒
超时和业务成功码 `10000`，可按产品后端协议调整，而共享包不会读取项目环境变量：

```ts
import { api } from '@/services/api';

const profile = await api.get<Profile>('/profile');
```

请求配置、响应解包、错误处理、取消和上传示例见
[请求客户端](docs/request-client.md)。

## Backstage

生成项目的 `src/providers/development-backstage.tsx` 属于项目，可直接增加 state、
quick actions 或其他调试配置。未配置时仅开发 bundle 默认显示；显式 `true` 或
`false` 都会覆盖默认值：

```env
EXPO_PUBLIC_ENABLE_BACKSTAGE=true
```

切换环境变量后先完整 Reload；只有确认是 Metro 缓存异常时才执行
`npx expo start --clear`。

## Reactotron

Development 未配置 host 时会从 Metro bundle 地址自动推导电脑地址。INT Release
必须设置 `EXPO_PUBLIC_REACTOTRON_HOST=<电脑局域网 IP>` 才会连接；Production 和 Web
不会连接。Reactotron Desktop 需监听 `9090`，真机与电脑必须网络互通，且防火墙需允许
该端口。v1.0.7 会在 socket 连接前接管并排队页面首屏日志，同时保留 warn/error 级别。

## 升级

```bash
npm run template:doctor
npm run template:update -- v2.0.0
```

### SDK 58 与监控

当前开发版支持 Expo SDK 58，新增项目的默认目标为 58。SDK 58 使用 React Native
`0.88`、`react-native-gesture-handler` `3.x` 和 Sentry `8.x`；共享包已放宽对应 peer
范围。生成项目会自动创建 `metro.config.js`，在 `src/app/_layout.tsx` 中用
`Sentry.wrap` 包裹根布局，并注册路由容器、捕获启动和路由错误。已有项目升级时，需要
先安装 `@sentry/react-native` 与 `@shopify/flash-list`，再按
[生成项目使用说明](docs/generated-project-usage.md#sentry-监控)手动接入项目侧文件；
模板升级不会覆盖业务源码。

升级只更新 `expo-template-kit` 的精确 Tag 和依赖，不会覆盖项目的 `src/app`、
`src/pages`、`src/components`、`src/i18n`、`src/providers`、`src/stores` 或配置。

### v2.0.0 包名迁移

共享包更名为 `expo-template-kit`，仓库地址同步调整为
`git@gitee.com:yu-guangji/expo-template-kit.git`。所有项目源码中的
`from 'rn-expo-template-kit'` 必须改为 `from 'expo-template-kit'`，
`package.json` 的依赖 key 也要同步替换。CLI 命令名 `create-rn-expo-app` 和
`rn-expo-template` 暂保持不变，已有项目的 `template:*` scripts 无需修改。
本次同时修正 Expo 原生模块的 peer 版本范围，避免安装时与项目已使用的
SDK 版本冲突，公开 API 不变。完整迁移步骤见
[v2.0.0 迁移说明](docs/migrations/v2.0.0.md)。

### v1.0.5 导出变更

`v1.0.5` 按项目要求收敛了根公开 API，不提供兼容别名：

| 已移除                                              | 替代方式                                              |
| --------------------------------------------------- | ----------------------------------------------------- |
| 包内 i18n 与 preferences store                      | 使用生成项目的 `src/i18n` 与 `src/stores`             |
| `QueryProvider`                                     | 使用 `@tanstack/react-query` 的 `QueryClientProvider` |
| `useColorScheme`                                    | 使用 React Native 的 `useColorScheme`                 |
| `usePagination`、`usePermission`、`useRequestError` | 在项目 `src/hooks` 中按业务需求实现                   |
| `useThemeColor`、`useThemeContext`                  | 使用公开的 `useTheme`                                 |

`useDeviceMetrics` 从根入口提供实时窗口、安全区与字体缩放指标，适用于横竖屏、
分屏、多窗口和折叠屏窗口变化；不再提供模块级静态屏幕尺寸常量。

### v1.0.6 Breaking Change

`isDev`、`isInt`、`isProd` 已从 `rn-expo-template-kit` 根入口移除，统一改为从生成项目的
`@/config/environment` 导入。共享 logger 也不再尝试读取项目 `.env`；生成项目会在根
布局根据 `isLoggerEnabled` 显式配置。已有项目升级前必须阅读
[v1.0.6 迁移说明](docs/migrations/v1.0.6.md)。

### v1.0.7 Reactotron 日志修复

新项目不会再丢失 Reactotron 建立连接前产生的页面首屏日志，也不会在开发环境文件中
写入维护者电脑的局域网 IP。已有项目需要按
[v1.0.7 迁移说明](docs/migrations/v1.0.7.md)手动更新项目拥有的 Reactotron 配置。

### v1.0.8 请求客户端

新生成项目会在 `src/services/api.ts` 创建项目拥有的请求客户端，并提供中间件、明确的
业务成功码和请求错误统一上报。已有项目升级前请阅读
[v1.0.8 迁移说明](docs/migrations/v1.0.8.md)。

### v1.0.9 Backstage 依赖升级

`rn-backstage` 升级至 `1.5.4`，已有项目执行模板升级即可获取新版本。

### v1.0.10 应用基础设施增强

生成项目新增全局网络状态与应用生命周期 Provider、离线提示、启动/路由错误恢复界面，
并为 `BasePage` 默认接入键盘避让。已有项目升级前请阅读
[v1.0.10 迁移说明](docs/migrations/v1.0.10.md)。

### v1.0.11 SDK 选择

新建项目默认使用最新支持的 Expo SDK 57，也可以通过 `--sdk 54` 或 `--sdk 56` 固定版本。
升级前请阅读 [v1.0.11 迁移说明](docs/migrations/v1.0.11.md)。

### v1.0.12 键盘库升级

新建项目通过 Expo CLI 安装与所选 SDK 兼容的 `react-native-keyboard-controller`，并继续默认
创建 Expo SDK 57 项目。已有项目升级前请阅读 [v1.0.12 迁移说明](docs/migrations/v1.0.12.md)。

### v1.0.13 主题覆写与格式化

生成项目新增 `src/config/theme.ts`，可按 light/dark 分别覆写主题色令牌；
未列出的令牌继续使用模板默认值。共享包同时导出 `ThemeOverrides`、`ColorTokens` 和
`useThemeName`，便于类型安全地配置和读取当前主题。该版本也加入 Prettier 配置，统一
项目格式化规则。升级前请阅读 [v1.0.13 迁移说明](docs/migrations/v1.0.13.md)。

### v1.0.14 原生模块依赖去重

`react-native-keyboard-controller` 改由 Expo CLI 为所选 SDK 安装，并作为共享包的 peer
dependency 提供；避免共享包与业务项目安装不同版本的原生模块。已有项目升级前请阅读
[v1.0.14 迁移说明](docs/migrations/v1.0.14.md)。

## 维护

- [后续优化路线图](docs/roadmap/README.md)
- [生成项目使用说明](docs/generated-project-usage.md)
- [请求客户端](docs/request-client.md)
- [v2.0.0 迁移说明](docs/migrations/v2.0.0.md)
- [v1.0.10 迁移说明](docs/migrations/v1.0.10.md)
- [v1.0.11 迁移说明](docs/migrations/v1.0.11.md)
- [v1.0.12 迁移说明](docs/migrations/v1.0.12.md)
- [v1.0.13 迁移说明](docs/migrations/v1.0.13.md)
- [v1.0.14 迁移说明](docs/migrations/v1.0.14.md)
- [v1.0.8 迁移说明](docs/migrations/v1.0.8.md)
- [v1.0.9 迁移说明](docs/migrations/v1.0.9.md)
- [v1.0.7 迁移说明](docs/migrations/v1.0.7.md)
- [v1.0.6 迁移说明](docs/migrations/v1.0.6.md)
- [模板反哺指南](docs/template-contribution.md)
- [发布与升级](docs/template-release-and-upgrade.md)

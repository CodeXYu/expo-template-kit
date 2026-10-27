# Expo Template Kit

共享基础包与 SDK 58 项目生成器。仓库根目录是可运行示例，当前仅提交源码，不发布版本。

从 GitHub 克隆仓库后，在根目录运行 node packages/kit/scripts/template-cli.mjs <name> --app-id <id>。
生成器会保存并安装独立的 vendor tarball；本地开发使用 npm run template:use-local。

完整目录和启动方式见 https://github.com/CodeXYu/expo-template-kit 。

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
npm run template:update -- 1.0 # 仅在将来创建该 Tag 后使用
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

启动图库的 AGP 9 兼容补丁由 postinstall 自动应用，仅替换已移除的 ProGuard 默认文件名；上游修复后可移除 packages/kit/scripts/patch-native-deps.mjs 中对应逻辑。

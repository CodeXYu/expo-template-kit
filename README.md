# Expo Template Kit

基于最新稳定 Expo SDK 58 的可运行示例应用、共享基础包和项目生成器。
应用使用 Expo Router，保留原有 UI / Page Kit、主题、React Query、Zustand、国际化、请求、日志、Sentry、Reactotron 和 Backstage 功能。
启动图使用 `react-native-splash-screen-newarch`。

## 运行示例

```bash
git clone git@github.com:CodeXYu/expo-template-kit.git
cd expo-template-kit
npm install
npm run android
# 或 npm run ios
```

首次运行会生成并构建原生工程。自定义启动图库需要 development build；请勿用 Expo Go 验证原生启动图。
后续使用 `npm start` 启动 Metro，再打开已安装的开发应用。
Web 使用 `npm run web`。

示例和生成项目均安装 `expo-dev-client`，并通过插件配置 `toolsButton: true` 显示开发环境悬浮工具按钮。
点击按钮打开开发菜单，再选择 Reload 重新加载；保存代码时仍可使用 Fast Refresh。
安装依赖或修改原生插件配置后，需要重新执行 `npm run android` 或 `npm run ios` 编译安装开发包，
仅重启 Metro 不会更新已有安装包。此按钮仅用于开发构建，正式版不显示。

环境变量结构见 `.env.template`。开发、集成和生产配置在首次安装时由模板补齐；已有本地配置不会覆盖。
Sentry 未配置 DSN 时不启用上报。不要提交本地环境文件或凭据。

## 目录

- `src/`：可运行示例的路由、页面、Provider、国际化和业务配置。
- `packages/kit/src/`：共享 UI、Page Kit、主题、请求、日志和生命周期。
- `packages/kit/template/`：生成新项目的模板。
- `packages/kit/scripts/`：创建、检查、升级及本地包开发命令。
- `packages/kit/test/`：共享包与生成器测试。
- `docs/`：完整功能说明；`docs/migrations/` 为旧版本归档。

共享实现统一从 `expo-template-kit` 导入，根应用通过 npm workspace 使用本地共享包。
修改生成项目默认行为时，同步更新示例和模板，不复制共享库实现。

## 创建新项目

在仓库根目录执行：

```bash
node packages/kit/scripts/template-cli.mjs my-app --app-id com.company.myapp
```

默认使用 SDK 58。生成器从 GitHub `main` 获取源码，只打包 `packages/kit`，将独立共享包保存到新项目的 `vendor/` 并安装。
请将生成项目的 `vendor/*.tgz` 和锁文件一起提交，使其他机器可以运行 `npm ci`。
现阶段只提交 GitHub 源码，尚未创建任何 Tag 或 Release，不需要 npm 发布。

生成项目保留以下管理命令：

```bash
npm run template:doctor
npm run template:use-local -- ../expo-template-kit
# 将来存在对应 Tag 后才使用：
npm run template:update -- 1.0
```

`create-rn-expo-app`、`rn-expo-template` 保留兼容，同时提供 `create-expo-kit` 和 `expo-template` 别名。
升级只替换共享包，不覆盖业务页面、配置、语言资源或路由。

## 验证

```bash
npm run lint
npm run typecheck
npm test
npm run verify:boundaries
npm run pack:check
npm run verify:matrix -- 58
```

详细能力见 [生成项目使用说明](docs/generated-project-usage.md) 和 [请求客户端说明](docs/request-client.md)。

启动图库的 AGP 9 兼容补丁由 postinstall 自动应用，仅替换已移除的 ProGuard 默认文件名；上游修复后可移除 packages/kit/scripts/patch-native-deps.mjs 中对应逻辑。

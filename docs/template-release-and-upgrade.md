# 模板版本与升级

当前仅提交 GitHub main 源码，不创建 Tag、GitHub Release 或 npm 发布。
package 版本为 1.0.0，只用于标识当前源码和本地 tarball。

## 创建项目

克隆 git@github.com:CodeXYu/expo-template-kit.git 后，在仓库根执行：

    node packages/kit/scripts/template-cli.mjs my-app --app-id com.company.myapp

生成器从 GitHub main 打包 packages/kit，共享包保存在生成项目 vendor/ 中。
将 vendor tarball 和锁文件一起提交，确保其他机器可使用 npm ci。

## 本地开发与未来升级

业务项目执行 npm run template:use-local -- ../expo-template-kit 使用本地共享包；
此操作不改写 package.json 或锁文件，恢复正式依赖使用 npm ci。

未来明确发布 Tag 后，才使用 npm run template:update -- <精确Tag>。
更新只替换共享包及必要依赖，不覆盖业务源码。1.0 与 v1.0.0 为不同的精确引用，不自动添加 v 前缀。

## SDK 与启动图

当前验收基线为 SDK 58，依赖由该 SDK 的 Expo CLI 解析。
兼容清单位于 packages/kit/package.json 的 template.supportedExpoSdks。

启动图固定使用 react-native-splash-screen-newarch。插件生成 Android 与 iOS 原生配置；
初始化完成或失败后由 useAppReady 隐藏启动图。必须构建 development build，不能使用 Expo Go 加载此原生模块。

迁移前的版本记录保存在 migrations/，仅供历史参考。

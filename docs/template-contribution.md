# 模板反哺指南

根目录 src/ 为可运行示例，共享能力位于 packages/kit/src/，新项目骨架位于 packages/kit/template/。
业务接口、Token、业务常量、产品文案与路由保留在业务项目，不进入共享包。

修改示例和模板的默认行为时同步更新两处，共享实现只维护 packages/kit/src/ 一份。
包源码不使用业务项目的 @/ 路径别名或直接读取项目环境变量。

业务项目使用 npm run template:use-local -- ../expo-template-kit 联调，完成后用 npm ci 恢复原依赖。
提交 GitHub PR 前运行 npm run lint、npm run typecheck、npm test 和 npm run verify:boundaries。
涉及生成器、Expo、原生模块或 Metro 时，额外运行 npm run verify:matrix -- 58，并验证 development build。
当前只提交源码，暂不创建任何 Tag 或 Release。

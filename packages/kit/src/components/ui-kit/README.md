# UI Kit

`ui-kit` 承载跨页面稳定复用的基础交互、表单、反馈与主题组件。所有公开组件从 `expo-template-kit` 导入，业务代码不得引用 `overlay/internal`。

## 组件目录

| 类别 | 组件                                                     | 使用准则                                                                 |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| 交互 | `Button`、`TouchableWrapper`、`AnimatedTouchableWrapper` | 用于明确操作；提交或支付场景显式启用跨控件防连点                         |
| 表单 | `Input`、`FormField`                                     | `FormField` 负责标签、说明和错误，输入值与业务校验仍归页面逻辑层         |
| 展示 | `ThemedText`、`ThemedView`、`Divider`、`ListRow`         | 保持主题感知；没有操作的 `ListRow` 不应暴露为读屏按钮                    |
| 反馈 | `Spinner`、`Loading`、`Toast`、`Overlay`                 | 页面局部状态优先 `Loading`；短反馈用 `Toast`；需要用户决策时用 `Overlay` |

## 边界

- `ui-kit`：跨页面可复用的视觉原子、交互与反馈，不包含业务字段、接口调用或页面导航。
- `page-kit`：页面壳、导航栏以及加载、空态、错误和离线等页面级状态。
- `src/pages/<feature>/components`：只服务一个稳定业务场景的组件。只有至少两个独立页面需要相同的行为和视觉契约时，才提升进 `ui-kit`。

## 主题与无障碍

`Colors` 提供基础文本、背景、边框与 `surface`、`textDisabled`、`success`、`warning`、`danger`、`overlay` 等语义 token。新项目应在 `src/config/theme.ts` 配置覆盖值，不能修改包内 `Colors`；共享组件必须优先使用 token。Figma 页面中的局部视觉值无需在本次迁移中批量替换。

可操作组件应提供本地化的 `accessibilityLabel` 和必要的 `accessibilityHint`，并传达 `disabled`、`busy` 等状态。用户可见文案和读屏文案均通过 i18n 提供。

## 新增组件准入

新增前必须满足：存在至少两个稳定使用点、现有组件无法表达、API 能保持页面无业务耦合，并补充 README 与行为测试。避免因单个 Figma 页面过早固化 `Chip`、日期选择器或开关行等组件。

## 验证

运行 `npx tsc --noEmit` 与 `npm run lint` 检查 UI Kit 的类型和静态规则；交互变更应在 iOS 与 Android 的目标设备上验证按压、禁用、读屏和键盘行为。

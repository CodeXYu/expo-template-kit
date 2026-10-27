# ThemedText

`ThemedText` 是面向展示场景的主题文本包装组件，把颜色 token 与常用排版规格集中在一起。

## 适用场景

- 纯展示型文本
- 需要快速切换标题、正文、小字、代码字样式的区域
- 需要直接绑定主题颜色 token 的文案

## 主要属性

| 属性             | 说明                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `type`           | 文本样式类型，支持 `default`、`title`、`small`、`smallBold`、`subtitle`、`link`、`linkPrimary`、`code` |
| `themeColor`     | 使用的主题颜色 token，默认 `text`                                                                      |
| 其余 `TextProps` | 如 `numberOfLines`、`style`、`children`                                                                |

## 默认行为与注意事项

- `type` 只管理排版样式，颜色统一从 `useTheme()` 读取。
- `type="code"` 会使用项目定义的等宽字体。
- 更复杂的可编辑输入或富文本不建议使用这个组件承载。

## 示例

```tsx
import { ThemedText } from 'expo-template-kit';

export function TitleBlock() {
  return <ThemedText type="subtitle">概览</ThemedText>;
}
```

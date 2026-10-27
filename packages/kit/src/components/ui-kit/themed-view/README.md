# ThemedView

`ThemedView` 是轻量的主题背景容器，适合纯展示型区域快速绑定主题色。

## 适用场景

- 页面区块背景
- 卡片或面板容器
- 需要按浅色/深色模式覆盖背景的简单容器

## 主要属性

| 属性             | 说明                                    |
| ---------------- | --------------------------------------- |
| `type`           | 主题颜色 token，默认 `background`       |
| `lightColor`     | 显式覆盖浅色模式颜色                    |
| `darkColor`      | 显式覆盖深色模式颜色                    |
| 其余 `ViewProps` | 如 `style`、`children`、`pointerEvents` |

## 默认行为与注意事项

- 默认根据 `type` 从 `useThemeColor` 解析背景色。
- `lightColor` / `darkColor` 只覆盖当前模式下的背景选择逻辑，不影响其他样式。
- 该组件只帮助处理背景色，不负责边框、阴影和间距。

## 示例

```tsx
import { ThemedText, ThemedView } from 'expo-template-kit';

export function SurfaceCard() {
  return (
    <ThemedView style={{ padding: 16, borderRadius: 16 }} type="backgroundElement">
      <ThemedText>内容区域</ThemedText>
    </ThemedView>
  );
}
```

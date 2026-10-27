# Spinner

`Spinner` 是对 React Native `ActivityIndicator` 的轻量封装，默认读取主题主色，并支持可选的居中容器。

## 适用场景

- 页面局部加载中状态
- 按钮或列表内部的小型等待指示器
- 需要复用主题主色的统一 loading 图标

## 主要属性

| 属性                          | 说明                              |
| ----------------------------- | --------------------------------- |
| `centered`                    | 是否包一层居中容器                |
| `color`                       | 自定义颜色，默认使用主题主色      |
| 其余 `ActivityIndicatorProps` | 例如 `size`、`animating`、`style` |

## 默认行为与注意事项

- 未传 `color` 时使用当前主题的 `primary`。
- `centered` 只负责包裹层的水平与垂直居中，不会强制占满父容器。

## 示例

```tsx
import { Spinner } from 'expo-template-kit';

export function InlineSpinner() {
  return <Spinner size="small" centered />;
}
```

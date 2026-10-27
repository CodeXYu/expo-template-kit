# Divider

`Divider` 用于在列表、分组或行内区域之间绘制主题感知的分隔线。

## 适用场景

- 列表项之间的横向分隔
- 并排元素之间的竖向分隔
- 需要带缩进的内容分组

## 主要属性

| 属性       | 说明                                                            |
| ---------- | --------------------------------------------------------------- |
| `inset`    | 分隔线缩进距离，横线作用于 `marginLeft`，竖线作用于 `marginTop` |
| `vertical` | 是否渲染为竖向分隔线                                            |
| `style`    | 额外样式                                                        |

## 默认行为与注意事项

- 默认渲染横向细线，高度为 `StyleSheet.hairlineWidth`。
- 颜色来自当前主题的 `border`。
- 竖向模式下高度需要由父容器提供。

## 示例

```tsx
import { View } from 'react-native';

import { Divider } from 'expo-template-kit';

export function GroupDivider() {
  return (
    <View>
      <Divider inset={16} />
    </View>
  );
}
```

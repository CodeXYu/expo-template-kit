# Input

`Input` 是项目内通用输入框，统一处理主题边框、错误提示、左右插槽和可清空逻辑。

## 适用场景

- 表单输入
- 搜索框
- 带前后图标或操作按钮的输入区域

## 主要属性

| 属性                      | 说明                                                       |
| ------------------------- | ---------------------------------------------------------- |
| `error`                   | 错误文案，存在时显示红色边框和错误文本                     |
| `disabled`                | 是否禁用                                                   |
| `leftSlot`                | 输入框左侧插槽                                             |
| `rightSlot`               | 输入框右侧插槽                                             |
| `clearable`               | 是否在有值时显示清空按钮                                   |
| `onClear`                 | 点击清空按钮后的回调                                       |
| `multiline`               | 是否启用多行输入；启用后输入区会使用顶部对齐的稳定最小高度 |
| `clearAccessibilityLabel` | 清空操作的读屏文案，默认取 `common.clearInput`             |
| `containerStyle`          | 输入框外层样式                                             |
| `inputStyle`              | 文本输入样式                                               |
| 其余 `TextInputProps`     | 例如 `value`、`onChangeText`、`placeholder`                |

## 默认行为与注意事项

- `editable` 未显式传入时，会跟随 `disabled` 自动关闭编辑。
- `clearable` 仅在有值且未禁用时显示清空按钮。
- 聚焦时边框使用主题主色，错误态优先级高于聚焦态。
- `multiline` 直接使用 React Native `TextInput` 的多行能力；标签、辅助说明与错误提示请由 `FormField` 承载。

## 示例

```tsx
import { Ionicons } from '@expo/vector-icons';

import { Input } from 'expo-template-kit';

export function SearchInput() {
  return (
    <Input
      placeholder="搜索内容"
      clearable
      leftSlot={<Ionicons name="search-outline" size={18} color="#6B7280" />}
    />
  );
}
```

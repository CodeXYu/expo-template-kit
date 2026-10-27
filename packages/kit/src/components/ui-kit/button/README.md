# Button

`Button` 是项目内通用按钮组件，统一处理主题色、尺寸、加载态、禁用态和左右插槽。

## 适用场景

- 页面主操作按钮
- 次级操作或弱化按钮
- 需要加载中状态的提交、保存、搜索等操作

## 主要属性

| 属性                         | 说明                                           |
| ---------------------------- | ---------------------------------------------- |
| `label`                      | 按钮文案，必填                                 |
| `variant`                    | 风格类型，支持 `primary`、`secondary`、`ghost` |
| `size`                       | 尺寸，支持 `sm`、`md`、`lg`                    |
| `loading`                    | 是否显示加载中状态                             |
| `disabled`                   | 是否禁用                                       |
| `leftSlot`                   | 文案左侧插槽                                   |
| `rightSlot`                  | 文案右侧插槽                                   |
| `textStyle`                  | 文案样式                                       |
| `style`                      | 容器样式，支持静态样式或按压状态函数           |
| 其余 `TouchableWrapperProps` | 如 `onPress`、`mode`、`delay`                  |

## 默认行为与注意事项

- `loading` 时会显示 `Spinner`，并与 `disabled` 一样阻止点击。
- `primary` 使用主题主色，`secondary` 带边框，`ghost` 为透明背景。
- `style` 若传函数，可读取 `pressed` 与 `disabled` 状态。

## 示例

```tsx
import { Ionicons } from '@expo/vector-icons';

import { Button } from 'expo-template-kit';

export function SaveButton() {
  return (
    <Button
      label="保存"
      leftSlot={<Ionicons name="save-outline" size={16} color="#FFFFFF" />}
      onPress={() => {}}
    />
  );
}
```

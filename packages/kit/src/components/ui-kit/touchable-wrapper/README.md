# TouchableWrapper

`TouchableWrapper` 是项目内共享点击基座，统一处理点击防抖/节流、全局防连点、按压态样式和无障碍状态。

## 适用场景

- 需要自定义容器样式的可点击区域
- 共享的列表行、卡片、按钮等基础交互封装
- 需要避免重复点击或连续点击误触的操作入口

## 主要属性

| 属性                     | 说明                                          |
| ------------------------ | --------------------------------------------- |
| `onPress`                | 点击回调                                      |
| `mode`                   | 点击模式，支持 `none`、`debounce`、`throttle` |
| `delay`                  | 防抖/节流时长                                 |
| `enableGlobalProtection` | 是否启用模块级全局防连点                      |
| `disabled`               | 是否禁用                                      |
| `loading`                | 是否视为忙碌态，同时禁用点击                  |
| `useNativePressable`     | 是否改用 React Native 原生 `Pressable`        |
| `style`                  | 容器样式，支持静态样式或按压状态函数          |
| `children`               | 子内容                                        |

还导出：

- `setGlobalPressInterval(ms)`：修改全局防连点时间窗
- `TouchableWrapperMode`：点击模式类型

## 默认行为与注意事项

- 默认 `mode="throttle"`、`delay=500`、`enableGlobalProtection=false`。
- 全局防连点默认关闭，避免选择器、列表和相邻操作互相吞掉点击；提交、支付等需要跨控件互斥的流程必须显式传入 `enableGlobalProtection`。
- `disabled` 或 `loading` 时不会触发 `onPress`。
- `style` 传函数时可读取 `{ pressed, disabled }`。
- `throttle` 模式只会立即触发首个点击，不会补发尾部点击。

## 示例

```tsx
import { Text } from 'react-native';

import { TouchableWrapper } from 'expo-template-kit';

export function TapRow() {
  return (
    <TouchableWrapper
      onPress={() => {}}
      style={({ pressed }) => ({
        padding: 16,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text>点击区域</Text>
    </TouchableWrapper>
  );
}
```

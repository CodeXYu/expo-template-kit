# AnimatedTouchableWrapper

`AnimatedTouchableWrapper` 是 `TouchableWrapper` 的动画外壳，在复用点击保护、节流/防抖和无障碍能力的同时，为整个点击区域增加按下缩放与透明度反馈。

## 适用场景

- 卡片、按钮、行项等需要更明显按压反馈的可点击区域
- 想复用 `TouchableWrapper` 的点击门控，但又不想在业务层重复写 Reanimated 动画

## 主要属性

| 属性                         | 说明                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `animationEnabled`           | 是否开启按压动画，默认 `true`                          |
| `animationConfig`            | 动画配置，可覆盖缩放、透明度、按下/抬起时长            |
| `animatedStyle`              | 额外的动画容器样式                                     |
| 其余 `TouchableWrapperProps` | 例如 `onPress`、`mode`、`delay`、`disabled`、`loading` |

`animationConfig` 支持：

- `pressedScale`
- `pressedOpacity`
- `pressInDuration`
- `pressOutDuration`

## 默认行为与注意事项

- 动画作用在最外层容器上，背景、边框和子元素会一起缩放。
- 关闭 `animationEnabled` 后会立刻恢复到 `scale=1`、`opacity=1`。
- 点击节流、防抖和全局防连点能力仍由 `TouchableWrapper` 负责。

## 示例

```tsx
import { Text } from 'react-native';

import { AnimatedTouchableWrapper } from 'expo-template-kit';

export function PressCard() {
  return (
    <AnimatedTouchableWrapper
      onPress={() => {}}
      style={{
        borderRadius: 16,
        padding: 16,
        backgroundColor: '#FFFFFF',
      }}
    >
      <Text>按下我</Text>
    </AnimatedTouchableWrapper>
  );
}
```

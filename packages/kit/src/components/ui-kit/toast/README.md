# Toast

`toast` 提供全局命令式轻提示能力，基于 Overlay 实现，适合成功、失败、信息和停止等短暂反馈。

## 适用场景

- 保存成功、提交失败、网络恢复等轻反馈
- 顶部、中部、底部的短时浮层提示
- 需要保持全局单例、后一个提示替换前一个提示的场景

## 公开导出

| 导出                                  | 说明                           |
| ------------------------------------- | ------------------------------ |
| `showToast(options)`                  | 显示自定义 toast               |
| `hideToast(id?)`                      | 关闭当前 toast，可选按 id 关闭 |
| `message(text, duration?, position?)` | 普通消息提示                   |
| `success(text, duration?, position?)` | 成功提示                       |
| `fail(text, duration?, position?)`    | 失败提示                       |
| `info(text, duration?, position?)`    | 信息提示                       |
| `stop(text, duration?, position?)`    | 停止提示                       |

## 主要参数

`ToastOptions` 支持：

- `text`
- `icon`
- `position`
- `duration`
- `animated`
- `onClose`

相关类型：

- `ToastPosition`: `top` / `center` / `bottom`
- `ToastDuration`: `short` / `long` / number
- `ToastIconType`: `none` / `success` / `fail` / `info` / `stop`

## 默认行为与注意事项

- toast 是全局单例；显示新的 toast 时会主动关闭旧实例。
- `duration="short"` 默认 2000ms，`duration="long"` 默认 3500ms。
- `message` 默认显示在底部，其余带状态图标的方法默认显示在中间。

## 示例

```tsx
import { Button, success } from 'expo-template-kit';

export function SaveToastTrigger() {
  return (
    <Button
      label="保存"
      onPress={() => {
        success('保存成功');
      }}
    />
  );
}
```

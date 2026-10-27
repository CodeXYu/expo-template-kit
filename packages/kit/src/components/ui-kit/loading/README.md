# Loading

`loading` 目录同时提供内联加载组件和全局命令式加载能力，适合页面局部等待态与全局阻塞态两类场景。

## 适用场景

- 页面局部内容加载中的占位反馈
- 提交、支付、鉴权等需要临时阻塞交互的全局等待态
- 路由切换或异步流程结束时的加载清理

## 公开导出

| 导出                     | 说明                                   |
| ------------------------ | -------------------------------------- |
| `Loading`                | 内联加载组件                           |
| `LoadingOverlay`         | 受控的全局加载声明式桥接组件           |
| `GlobalLoadingHost`      | 全局加载宿主，通常挂在应用 Provider 内 |
| `showLoading(options)`   | 打开全局加载                           |
| `hideLoading()`          | 关闭全局加载                           |
| `updateLoading(options)` | 更新当前全局加载内容                   |
| `useLoadingCleanup()`    | 组件卸载时自动清理全局加载             |

## 主要属性与参数

`LoadingProps`：

- `fullScreen`
- `color`
- `size`
- `text`

`GlobalLoadingOptions` / `LoadingOverlayProps` 常用字段：

- `text`
- `duration`
- `visible`
- `color`
- `maskColor`
- `size`

## 默认行为与注意事项

- `Loading` 默认文案来自 `t("common.loading")`。
- `showLoading` 支持直接传字符串，等价于只设置 `text`。
- `duration` 大于 `0` 时会自动关闭。
- 全局加载依赖 `GlobalLoadingHost` 挂载后才能显示。

## 示例

```tsx
import { Button, hideLoading, showLoading } from 'expo-template-kit';

export function SubmitButton() {
  return (
    <Button
      label="提交"
      onPress={() => {
        showLoading('提交中');
        setTimeout(() => {
          hideLoading();
        }, 1000);
      }}
    />
  );
}
```

# Overlay 浮层系统

Overlay 是应用内轻量浮层系统，适合确认弹窗、底部面板、侧边面板、菜单和锚点气泡。业务代码只使用本目录导出的命令式 API；`internal/` 是私有实现层，不应直接导入。

设计目标：

- 业务侧以命令式方式打开浮层，不把临时弹层塞进页面 JSX 状态。
- 浮层内容仍挂在应用 Provider 树下，可以读取主题、i18n、React Query 等上下文。
- Loading 与业务浮层共享底层 runtime，但批量关闭业务浮层时不会影响 Loading。
- 内部实现保持单 Host、多实例栈结构，只有最上层浮层响应背景点击和 Android 返回键。

## 前提

- 项目基于生成时选择的 Expo SDK（当前默认 SDK 58）、React 19、目标 React Native
  版本和 Reanimated 4；具体版本以项目 `package.json` 和 `expo install` 结果为准。
- 应用根部必须挂载 `OverlayProvider`。生成项目已在 `AppProviders` 中将它放在 `ThemeProvider` 和 TanStack `QueryClientProvider` 内部，确保浮层内容能读取主题、查询和业务上下文。

```tsx
import { OverlayProvider } from 'expo-template-kit';

<OverlayProvider>
  <App />
</OverlayProvider>;
```

## Quick Start

业务代码统一从 `expo-template-kit` 导入命令式 API。大多数场景只需要调用
`showOverlayModal`、`showOverlaySheet` 或 `showOverlayPopover`，并在内容里
使用返回的 `OverlayHandle` 关闭浮层。

```tsx
import { Text, View } from 'react-native';

import {
  Button,
  type OverlayPopoverOptions,
  showOverlayModal,
  showOverlayPopover,
  showOverlaySheet,
} from 'expo-template-kit';

function openConfirm() {
  showOverlayModal({
    content: overlay => (
      <View>
        <Text>确认提交？</Text>
        <Button label="取消" onPress={overlay.close} />
        <Button label="确认" onPress={overlay.close} />
      </View>
    ),
  });
}

function openSheet() {
  showOverlaySheet({
    content: overlay => (
      <View>
        <Text>筛选条件</Text>
        <Button label="完成" onPress={overlay.close} />
      </View>
    ),
  });
}

function openMenu(anchor: OverlayPopoverOptions['fromView']) {
  if (!anchor) return;

  showOverlayPopover({
    fromView: anchor,
    direction: 'bottom',
    align: 'center',
    content: <Text>更多操作</Text>,
  });
}
```

## API

从 `expo-template-kit` 导入：

```tsx
import {
  hideAllOverlayViews,
  showOverlayModal,
  showOverlayPopover,
  showOverlaySheet,
  useOverlay,
  useOverlayGuard,
} from 'expo-template-kit';
```

| API                                  | 说明                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `showOverlayModal(options)`          | 显示居中弹窗，返回 `OverlayHandle`                                 |
| `showOverlaySheet(options)`          | 显示四边滑出的面板，返回 `OverlayHandle`                           |
| `showOverlayPopover(options)`        | 显示锚点气泡，返回 `OverlayHandle`                                 |
| `hideAllOverlayViews()`              | 关闭通过上述 API 打开的业务浮层，不影响 Loading                    |
| `useOverlay()`                       | 返回稳定的 `showModal`、`showSheet`、`showPopover`、`hideAll` 方法 |
| `useOverlayGuard(trigger, options?)` | `trigger` 变化时自动关闭业务浮层，常用于路由切换清理               |

### API Defaults

| 类型    | 默认动画                          | 默认 `modal` | 默认遮罩             | 默认关闭方式                                |
| ------- | --------------------------------- | ------------ | -------------------- | ------------------------------------------- |
| Modal   | `animated=true`，`type="zoomOut"` | `true`       | `overlayOpacity=0.4` | 内容显式调用 `handle.close()`               |
| Sheet   | `animated=true`，`side="bottom"`  | `false`      | `overlayOpacity=0.4` | 点击背景、Android 返回键或 `handle.close()` |
| Popover | 无专属位移动画，跟随基础淡入      | `false`      | `overlayOpacity=0`   | 点击背景、Android 返回键或 `handle.close()` |

所有类型都支持 `overlayKey`、`onClose`、`onCloseRequest`、
`onDisappearCompleted` 和 `closeOnHardwareBackPress`。传入
`onCloseRequest` 后，背景点击和 Android 返回键只会回调给业务侧，默认关闭
逻辑不会自动执行。

## OverlayHandle

```ts
type OverlayHandle = {
  id: number;
  close: () => void;
  update: (nextOptions) => void;
};
```

- `close()` 触发关闭动画，并调用当前 options 上的 `onClose`。
- `update(nextOptions)` 合并新 options 并刷新内容。
- `id` 只用于调试和日志，不建议业务依赖具体数值。

`close()` 是幂等的，重复调用不会重复触发 `onClose`。如果同一个浮层正在消失动画中，后续 `update()` 会被忽略。

`content` 支持直接节点或函数：

```ts
content: React.ReactNode;
content: (overlay: OverlayHandle) => React.ReactNode;
```

命令式 overlay 打开后，`content` 会进入 overlay runtime 的独立渲染树。
如果浮层内有表单、计数器等动态内容，优先把 state 放在 `content`
内部组件中；如果需要从调用页面刷新已打开浮层，请使用
`OverlayHandle.update()` 主动传入新的 options 或 content。

### overlayKey 与更新

`overlayKey` 用于给命令式浮层去重。同一个 `overlayKey` 再次打开时不会新增一层浮层，而是更新已存在的实例：

```tsx
showOverlaySheet({
  overlayKey: 'profile-editor',
  content: <ProfileEditor userId={userId} />,
});
```

适合这些场景：

- 全局只允许出现一个同类面板，例如资料编辑、筛选器、操作菜单。
- 页面重复点击同一个入口时，希望刷新浮层内容而不是堆叠多个实例。
- 调用方无法可靠保存 `OverlayHandle`，但可以提供稳定业务 key。

注意：

- `overlayKey` 只影响命令式 overlay 实例去重，不参与 React key diff。
- 使用相同 `overlayKey` 时，新 options 会覆盖当前实例的渲染内容；业务表单内部未提升的 local state 可能会随内容重建而重置。

## Modal

```tsx
showOverlayModal({
  modal: true,
  overlayOpacity: 0.4,
  content: overlay => (
    <View>
      <Text>确认提交？</Text>
      <Button label="取消" onPress={overlay.close} />
    </View>
  ),
});
```

常用 options：

| 属性                       | 默认值      | 说明                                  |
| -------------------------- | ----------- | ------------------------------------- |
| `content`                  | 必填        | 弹窗内容                              |
| `modal`                    | `true`      | 是否禁止点击背景关闭                  |
| `animated`                 | `true`      | 是否启用动画                          |
| `type`                     | `"zoomOut"` | `"zoomOut"` / `"zoomIn"` / `"custom"` |
| `containerStyle`           | -           | 内容动画容器样式                      |
| `customBounds`             | -           | `type="custom"` 时的起始区域          |
| `overlayOpacity`           | `0.4`       | 遮罩透明度                            |
| `maskColor`                | `"#000"`    | 遮罩颜色                              |
| `autoKeyboardInsets`       | `false`     | 是否使用键盘避让                      |
| `closeOnHardwareBackPress` | `true`      | Android 返回键是否触发关闭请求        |

Modal 默认 `modal=true`，即点击背景不会关闭。需要点击遮罩关闭时显式传 `modal: false`，或传入 `onCloseRequest` 自行决定是否关闭。

## Sheet

```tsx
showOverlaySheet({
  side: 'bottom',
  autoKeyboardInsets: true,
  content: overlay => (
    <View>
      <Text>填写资料</Text>
      <Input placeholder="昵称" />
      <Button label="完成" onPress={overlay.close} />
    </View>
  ),
});
```

常用 options：

| 属性                 | 默认值     | 说明                                                      |
| -------------------- | ---------- | --------------------------------------------------------- |
| `content`            | 必填       | 面板内容                                                  |
| `side`               | `"bottom"` | `"top"` / `"bottom"` / `"left"` / `"right"`               |
| `modal`              | `false`    | 是否禁止点击背景关闭                                      |
| `animated`           | `true`     | 是否启用滑入动画                                          |
| `rootTransform`      | `"none"`   | `"none"` / `"translate"` / `"scale"` / 自定义 transform   |
| `autoKeyboardInsets` | `false`    | 由 `OverlaySheet` 内部处理键盘避让，主要用于 bottom sheet |
| `containerStyle`     | -          | 面板外层样式                                              |
| `overlayOpacity`     | `0.4`      | 遮罩透明度                                                |

`autoKeyboardInsets` 使用键盘事件和 Reanimated padding 驱动，只在
`side="bottom"` 时应用底部避让；`top`、`left`、`right` 面板不会增加底部
keyboard padding，避免非底部面板产生意外布局偏移。

`rootTransform` 会作用到 `OverlayProvider` 包裹的应用根内容：

- `"none"`：不移动根内容。
- `"translate"`：按 sheet 尺寸把根内容向相反方向推开。
- `"scale"`：把根内容缩放到统一比例。
- 自定义数组：直接传入 `translateX`、`translateY`、`scaleX`、`scaleY` 组合。

## Popover

```tsx
showOverlayPopover({
  fromView: buttonRef.current,
  direction: 'bottom',
  align: 'center',
  content: <Text>气泡内容</Text>,
});
```

常用 options：

| 属性              | 默认值     | 说明                                                   |
| ----------------- | ---------- | ------------------------------------------------------ |
| `content`         | 必填       | 气泡内容                                               |
| `fromBounds`      | -          | 锚点窗口坐标                                           |
| `fromView`        | -          | 支持 `measureInWindow` 的锚点 ref                      |
| `direction`       | `"bottom"` | `"top"` / `"bottom"` / `"left"` / `"right"` / `"down"` |
| `autoDirection`   | `true`     | 靠近边缘时自动调整方向                                 |
| `directionInsets` | `0`        | 弹出方向偏移                                           |
| `align`           | `"end"`    | `"start"` / `"center"` / `"end"`                       |
| `alignInsets`     | `0`        | 对齐方向偏移                                           |
| `showArrow`       | `true`     | 是否显示箭头                                           |
| `paddingCorner`   | -          | 箭头距角落的距离                                       |
| `popoverStyle`    | -          | 气泡容器样式                                           |
| `overlayOpacity`  | `0`        | 默认无遮罩                                             |

Popover 锚点来源优先级：

- 推荐传 `fromView`。它必须支持 `measureInWindow(callback)`，例如 React
  Native `View`、`Pressable` 或项目内转发了测量方法的按钮组件。
- 传入 `fromBounds` 时，它表示 window 坐标，形如
  `{ x, y, width, height }`。Overlay 内部会转换到浮层宿主的本地坐标。
- 同时传入 `fromBounds` 和 `fromView` 时，优先使用 `fromBounds`。
- `direction="down"` 是兼容旧写法，内部等同于 `"bottom"`。
- `autoDirection=true` 时，如果目标方向空间不足，会在同轴方向上自动翻转。

不要在业务侧把 `measureInWindow` 的结果减去状态栏、安全区或页面偏移；
`showOverlayPopover` 会统一处理 window 坐标到 Overlay 本地坐标的转换。只有在
锚点不是实际 View，例如来自手势坐标或自定义选区时，才需要手动传
`fromBounds`。

按钮菜单示例：

```tsx
const anchorRef = useRef<View>(null);

<Pressable
  ref={anchorRef}
  onPress={() => {
    showOverlayPopover({
      fromView: anchorRef.current,
      direction: 'bottom',
      align: 'end',
      content: overlay => (
        <View>
          <Button label="编辑" onPress={overlay.close} />
          <Button label="删除" onPress={overlay.close} />
        </View>
      ),
    });
  }}
>
  <Text>更多</Text>
</Pressable>;
```

## 关闭语义

- `modal=false` 时，点击背景或 Android 返回键会调用默认关闭逻辑，且只有最上层浮层响应。
- `modal=true` 时，背景点击不会关闭；内容中应显式调用 `handle.close()`。
- 传入 `onCloseRequest(handle)` 后，背景点击和 Android 返回键会交给调用方处理。
- `onClose` 表示业务关闭请求已发生。
- `onDisappearCompleted` 表示消失动画结束，不应承载业务关闭状态。
- `hideAllOverlayViews()` 只关闭 `showOverlayModal`、`showOverlaySheet`、`showOverlayPopover` 创建的业务浮层，不关闭 `showLoading()` 创建的 Loading。

推荐把业务副作用放在 `onClose` 或按钮回调里，把清理动画资源、临时 UI 状态放在 `onDisappearCompleted`。

## 常用 Recipes

### 确认弹窗

```tsx
showOverlayModal({
  content: overlay => (
    <View>
      <Text>删除后不可恢复，确认删除？</Text>
      <Button label="取消" onPress={overlay.close} />
      <Button
        label="删除"
        onPress={() => {
          deleteItem();
          overlay.close();
        }}
      />
    </View>
  ),
});
```

### 表单 Sheet

```tsx
showOverlaySheet({
  autoKeyboardInsets: true,
  content: overlay => (
    <View>
      <Input placeholder="昵称" />
      <Button label="保存" onPress={overlay.close} />
    </View>
  ),
});
```

### `overlayKey` 去重

```tsx
showOverlaySheet({
  overlayKey: 'filter-panel',
  content: <FilterPanel />,
});
```

重复调用相同 `overlayKey` 会更新已有浮层，不会堆叠多个同类实例。

### `handle.update` 刷新内容

```tsx
const handle = showOverlayModal({
  content: <Text>处理中...</Text>,
  modal: true,
});

handle.update({
  content: overlay => (
    <View>
      <Text>处理完成</Text>
      <Button label="知道了" onPress={overlay.close} />
    </View>
  ),
});
```

## useOverlay

```tsx
const overlay = useOverlay();

overlay.showSheet({
  content: handle => <Button label="关闭" onPress={handle.close} />,
});
```

该 hook 只提供稳定方法引用，适合在页面逻辑层或回调中统一注入 overlay 能力。

## useOverlayGuard

```tsx
useOverlayGuard(pathname);
```

`useOverlayGuard` 会在 `trigger` 变化时关闭当前业务浮层，常用于页面切换、登录态切换或离开某个流程时清理临时 UI。传入 `{ enabled: false }` 可临时停用。

它只调用 `hideAllOverlayViews()`，因此不会关闭全局 Loading。

## 常见陷阱

- `modal: true` 表示禁止点击背景关闭。需要背景关闭时传 `modal: false`，
  或在 `onCloseRequest` 中手动调用 `handle.close()`。
- `onCloseRequest` 会接管背景点击和 Android 返回键；传入后默认关闭逻辑不会自动执行。
- Popover 推荐传 `fromView`。手动传 `fromBounds` 时使用 window 坐标，不要自行扣减状态栏或 safe area。
- Popover 的自定义外层不要使用全屏 `pointerEvents="auto"` 容器吞掉背景点击，否则 `modal=false` 也无法点背景关闭。
- 不要从 `src/components/ui/overlay/internal` 导入业务代码；内部 API 不承诺稳定。
- `hideAllOverlayViews()` 只关闭业务浮层，不会关闭 `showLoading()` 创建的全局 Loading。

## 接入检查

- 打开后确认浮层内容能读取主题、i18n、React Query 等 Provider 上下文。
- `modal=false` 时验证背景点击和 Android 返回键可以关闭；`modal=true` 时验证只能通过内容按钮关闭。
- Popover 在上、下、左、右和靠近屏幕边缘时都应能对齐锚点，`autoDirection` 只做同轴翻转。
- 在 iOS 刘海屏、Android 状态栏和横竖屏变化后，检查 Popover arrow 仍指向锚点。
- 使用 `overlayKey` 的场景，重复点击入口应更新同一实例而不是叠加多层。

## 内部架构

业务 API 到实际渲染的路径如下：

```text
showOverlayModal / showOverlaySheet / showOverlayPopover
  -> actions.tsx 创建 OverlayHandle，并处理业务关闭语义
  -> runtime.ts 分配 id、管理 ref、overlayKey 去重和实例清理
  -> host-controller.ts 暴露当前 OverlayHost 的命令入口
  -> OverlayHost.tsx 把浮层插入 Provider 树内，并标记最上层实例
  -> OverlayBase / OverlayModal / OverlaySheet / OverlayPopover 执行动画和交互
```

职责边界：

- `actions.tsx`：公共命令式 API，只管理业务 overlay，不直接服务 Loading。
- `runtime.ts`：底层实例 runtime，业务 overlay 和 Loading 都可复用。
- `OverlayHost.tsx`：唯一渲染宿主，维护浮层栈和根内容 transform。
- `OverlayBase.tsx`：统一遮罩、关闭请求、Android 返回键和基础淡入淡出。
- `OverlayModal.tsx`、`OverlaySheet.tsx`、`OverlayPopover.tsx`：各自处理内容动画、定位和专属交互。

## 目录说明

```text
src/components/ui/overlay/
├── README.md
├── index.ts
├── actions.tsx
├── hooks.ts
├── types.ts
└── internal/
    ├── constants.ts
    ├── OverlayHost.tsx
    ├── OverlayBase.tsx
    ├── OverlayModal.tsx
    ├── OverlaySheet.tsx
    ├── OverlayPopover.tsx
    ├── PopoverSurface.tsx
    ├── runtime.ts
    ├── host-controller.ts
    └── use-popover-position.ts
```

## 使用边界

- 轻量应用内浮层使用 Overlay。
- 路由级弹层、深链流程、需要浏览器返回栈参与的完整页面流程使用 Expo Router modal screen。
- 需要系统级原生弹窗语义的场景使用 React Native `Modal`。
- 不要从 `overlay/internal` 导入业务代码；该目录只服务 Overlay、Loading 和 Provider。

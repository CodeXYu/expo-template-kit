# BasePage

`BasePage` 是页面布局壳：提供默认导航栏、安全区、滚动/键盘布局和明确的整页状态视图。
它不订阅网络或 AppState，也不根据设备网络状态自动替换页面内容。

## 使用前提

应用根层必须先挂载 `AppLifecycleProvider` 和 `NetworkStatusProvider`。生成项目的
`AppProviders` 已完成这项配置。`BasePage` 在离线页重试时会调用全局网络 `refresh()`；
在 Provider 之外使用会抛出明确错误。

## 基本页面

```tsx
<BasePage title={t('profile.title')} showBack={false}>
  <ProfileContent />
</BasePage>
```

默认显示 `NavBar`。`NavBarProps`（如 `title`、`showBack`、`rightElement`、
`onBackPress` 和 `showBorder`）可直接传给 `BasePage`。

根路由通常应传入 `showBack={false}`，避免显示没有可返回页面的按钮。

## 整页状态

`pageStatus` 是整页状态的唯一来源，取值为 `"default" | "loading" | "empty" |
"error" | "offline"`。不要再用设备网络状态直接切换整页 UI；页面逻辑应结合请求是否
失败以及是否有缓存内容后，再决定状态。

```tsx
<BasePage
  pageStatus={pageStatus}
  pageError={query.error}
  onRetry={() => void query.refetch()}
  retryLabel={t('common.retry')}
>
  <ProfileContent />
</BasePage>
```

- `pageStatus="error"` 可选传 `pageError`；未传时显示本地化通用错误文案，不会出现空白页。
- `pageStatus="offline"` 的重试会先刷新全局网络状态，再调用 `onRetry`。
- `statusViewStyle` 作用于 loading、empty、error 和 offline 状态视图，不改变正常内容布局。
- 只有“请求失败且没有可展示内容”适合使用 `offline`；已有内容时保留内容，按业务需要显示局部提示。

## 导航栏与安全区

| 属性                   | 说明                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `header`               | 不传时渲染默认 `NavBar`；传入节点时替换默认导航；传 `null` 隐藏导航。      |
| `headerStyle`          | 默认或自定义 header 外层容器样式。                                         |
| `contentSafeAreaEdges` | 内容应用安全区的边，可传 `top`、`right`、`bottom`、`left`。                |
| `safeAreaInsets`       | 覆盖设备读取到的部分 inset，适用于已知的嵌入式容器约束。                   |
| `colorScheme`          | 本页的 `light` / `dark` 外观覆盖；同时影响默认导航栏颜色与状态栏文字颜色。 |
| `statusBarStyle`       | 显式覆盖状态栏文字颜色；通常无需传入。                                     |

有默认或自定义 header 时，内容默认使用右、下、左安全区；`header={null}` 时，内容默认使用
四边安全区。自定义 `header` 本身不自动获得顶部安全区，需要由该 header 自己处理。

## 内容与键盘

| 属性                        | 说明                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `scrollEnabled`             | 默认 `true`。关闭后渲染静态内容容器。                                                      |
| `keyboardAware`             | 默认 `true`。滚动内容使用 `KeyboardAwareScrollView`，静态内容使用 `KeyboardAvoidingView`。 |
| `scrollViewProps`           | 仅滚动模式下透传给滚动容器；其 `style`、`contentContainerStyle` 可继续扩展基础样式。       |
| `staticContentProps`        | 仅 `scrollEnabled={false}` 时透传给内部内容 `View`。                                       |
| `contentStyle`              | 滚动模式下为 `contentContainerStyle`；静态模式下为内部内容 `View` 样式。                   |
| `refreshControl`            | 仅滚动模式下使用。                                                                         |
| `keyboardShouldPersistTaps` | 滚动模式下的键盘点击行为，默认 `"handled"`。                                               |

## 底部与生命周期

| 属性                                | 说明                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `scrollFooter`                      | 始终渲染在 children 后；滚动模式下属于滚动内容。                          |
| `bottomAccessory`                   | 渲染在内容区域下方、滚动区域外；不是覆盖在内容上的浮层。                  |
| `onFocus` / `onBlur`                | 对应 expo-router 页面获得/失去焦点。用于页面级任务，不用于全局 AppState。 |
| `containerStyle` / `containerProps` | 最外层页面容器样式和 View 属性。                                          |

若功能需要应用前后台状态，请使用 `useAppLifecycle()`；若需要读取或主动刷新网络状态，请使用
`useNetworkStatus()`。它们都由根层 Provider 统一维护。

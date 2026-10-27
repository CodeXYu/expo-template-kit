# ListRow

`ListRow` 是列表型页面的基础行组件，支持标题、详情、图标、分隔线和右侧 accessory。默认横向模式遵循典型的“标题在左、详情在右”布局。

## 适用场景

- 设置页、资料页、菜单页的列表项
- 需要右侧详情文案或状态展示的行项
- 需要点击反馈和箭头/勾选标识的列表入口

## 主要属性

| 属性                         | 说明                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `title`                      | 左侧标题，可传文本或自定义节点                               |
| `detail`                     | 右侧详情，可传文本或自定义节点                               |
| `icon`                       | 左侧图标区域                                                 |
| `accessory`                  | 右侧附属内容，支持 `none`、`indicator`、`check` 或自定义节点 |
| `titlePlace`                 | 标题布局位置，支持 `left`、`top`                             |
| `detailMultiLine`            | 是否允许详情多行                                             |
| `topSeparator`               | 顶部分隔线，支持 `none`、`full`、`indent`                    |
| `bottomSeparator`            | 底部分隔线，支持 `none`、`full`、`indent`                    |
| `titleStyle`                 | 标题文本样式                                                 |
| `detailStyle`                | 详情文本样式                                                 |
| `containerStyle`             | 最外层容器样式                                               |
| `style`                      | 行内容器样式                                                 |
| 其余 `TouchableWrapperProps` | 例如 `onPress`、`mode`、`delay`、`disabled`                  |

## 默认行为与注意事项

- `titlePlace="left"` 时，标题在左，详情在右并右对齐；适合设置项样式。
- `titlePlace="top"` 时，标题与详情上下堆叠，更适合长描述内容。
- `detailMultiLine` 未传时，横向模式默认单行，纵向模式默认多行。
- `accessory` 默认为 `indicator`，即右侧箭头。
- 未传 `onPress` 时渲染为纯展示行，不会以按钮角色暴露给读屏；展示状态请同时传 `accessory="none"` 或自定义状态节点。

## 示例

```tsx
import { ListRow } from 'expo-template-kit';

export function ProfileRow() {
  return <ListRow title="用户名" detail="joker" onPress={() => {}} topSeparator="full" />;
}
```

# FormField

`FormField` 提供表单字段的统一外层结构：标签、必填标记、辅助说明和错误信息。它不管理输入值、校验规则或请求状态。

## 适用场景

- `Input`、多行 `Input` 或页面私有选择器的字段标题与说明
- 需要在字段下方显示本地化校验错误或帮助文案的表单

## 主要属性

| 属性         | 说明                              |
| ------------ | --------------------------------- |
| `label`      | 已本地化的字段标题                |
| `required`   | 是否显示必填标记                  |
| `helperText` | 无错误时显示的辅助说明            |
| `error`      | 错误文案，优先级高于 `helperText` |
| `children`   | 实际输入控件或页面私有控件        |

## 示例

```tsx
<FormField label={t('profile.message')} helperText={t('profile.messageHint')}>
  <Input multiline value={message} onChangeText={setMessage} />
</FormField>
```

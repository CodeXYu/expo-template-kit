# 后续优化路线图

本目录维护 `expo-template-kit` 的后续计划。这里的内容会持续更新；原始分析只作为历史快照保留。

## 文档职责

| 文件                                             | 职责                                     |
| ------------------------------------------------ | ---------------------------------------- |
| [`current-state.md`](./current-state.md)         | 已验证的当前基线、完成项、限制和检查结果 |
| [`optimization-plan.md`](./optimization-plan.md) | 可执行的后续计划，按 P0/P1/P2 排序       |
| [`archive/`](./archive/)                         | 历史分析快照，不作为当前执行依据         |

## 状态约定

计划项使用统一标记：

| 标记  | 状态        | 含义                   |
| ----- | ----------- | ---------------------- |
| `[ ]` | TODO        | 尚未开始               |
| `[~]` | IN_PROGRESS | 正在实施               |
| `[x]` | DONE        | 已合并或已验证完成     |
| `[!]` | BLOCKED     | 有明确外部阻塞         |
| `[-]` | DEFERRED    | 已明确暂缓，不代表遗忘 |

## 维护规则

1. 每个批次开始前，在 `optimization-plan.md` 中标记为 `IN_PROGRESS`，并写清改动范围。
2. 批次完成后，把结果写入 `current-state.md`，同时在计划中标记为 `DONE` 或移出当前批次。
3. 每次更新 `current-state.md` 都要记录日期、代码基线提交和实际执行的验证命令。
4. 计划项必须包含目标、涉及文件、验收标准；不要只写“优化某模块”。
5. 已完成的详细分析放入 `archive/` 后保持只读，不在归档文件里继续追加新结论。
6. 当前阶段不新增 `src/components` 下的 UI 组件。优先改造现有组件、hooks、services 和 utils；只有现有能力无法承载且至少有稳定复用点时，才重新评审新增组件。
7. 文档中的 SDK、原生依赖和默认版本以生成项目的 `package.json` / `app.config.*` 为准，不在多个文档里重复写死。
8. 发布前检查根 `README.md` 的维护入口和本目录的计划状态是否一致。

## 当前入口

- 当前基线：[`current-state.md`](./current-state.md)
- 下一批计划：[`optimization-plan.md`](./optimization-plan.md)
- 原始分析：[`archive/2026-10-23-original-optimization-plan.md`](./archive/2026-10-23-original-optimization-plan.md)

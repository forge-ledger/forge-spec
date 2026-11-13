# event · 模板

**写规则：只追加。** 发生过的事不能被"更新"——改一条事件就是**篡改历史**。
要修正它，就追加一条新事件并引用它。

**v0 的 `assets/event/` 是空的，而这不是缺陷。** 从导出文件里机械推导出来的消息
是**来源的投影**（可重算），它们住在 `index/` 而不是 `assets/`。
进本目录的事件必须**含判断**：有人（或 Phase 4 的 Extractor，经候选区）认为
"这件事值得记住"。判据是**可重算性**，不是"看起来像不像产物"。

| 章节 | 说明 |
|---|---|
| 无必填章节 | 事件是"发生了什么"，不是需要论证的结论。但正文至少要能独立读懂 |

`requires_fields`：无。`requires_sections`：无。

`subject` 对本类型是**可选**的，而且通常留空：事件是"发生过什么"，
它不会被后来的事件推翻（所以不参与冲突判定），`sources` 里的 `#k:` 键
已经能精确定位它。填它只有一种用途——让 归并工具 把讲同一件事的
多条事件归并到同一个实体。

## 示例

````markdown
---
schema_version: 1
id: event_01M6QGCKZ15QPTV67AZ839ZQ40
type: event
status: recorded
created: "2026-10-03"
last_confirmed: null
supersedes: null
origin_incident: null
subject: null
sources:
  - "src://src_01M6QE3MZDZ9JE8EFMW27VAVKT#k:conv_incident/msg_0101"
sensitivity: internal
confidence: 1
---

# 2026-10-03 线上库的 data/ 被误提交进一个分支

撤回本身不复杂，麻烦的是从此所有人都知道闸门可以被绕过。
这次事故直接长出了 R1（用户数据永不进 git）。
````

## 与其他类型的边界

- **只追加**：没有 `supersedes` 的意义（它看着像能取代，实际不能）。写错了就再追加一条更正。
- 它不是状态：状态会变，事件不变。
- 它不进 `AGENTS.md` 的常驻上下文。事件量级太大，预加载会 context rot——
  它属于 `INDEX.md` 与将来的检索层（Phase 6）。

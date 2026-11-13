# state · 模板

**写规则：就地替换，而且必须带日期。** 同一件事的当前状态只有一条，
新的确认覆盖旧的——但覆盖时必须更新 `last_confirmed`，否则它无法被判过期。

**为什么必须有日期**：`state` 的失败模式不是"写错了"，是"**过期了但看起来仍然有效**"。
POC 之后约 60% 的失败来自数据新鲜度，而不是检索质量。一个没有日期的状态
在库里和一条刚确认过的状态长得一模一样——**过期的事实比没有事实更糟**。

| 字段 / 章节 | 作用 |
|---|---|
| `last_confirmed`（**必填**） | 最后一次确认它仍然成立的日期。它同时是新鲜度检查的输入 |
| `subject`（**必填**） | 这条状态讲的是**哪一件事**。归并与冲突的身份键由它派生 |
| `## 当前状态` | 一句话说清现在是什么样。不要写成过程叙述——状态不是日志 |

`requires_fields`：`last_confirmed`、`subject`。`requires_sections`：`当前状态`。

**为什么 `subject` 是必填的**：没有题面，这条状态就**不参与冲突判定**——
新来的事件推翻了它，而不会有任何东西报出来。把"缺失"做成
`REQUIRED_FIELD_MISSING`，它就从一片安静变成一条行动指令。

题面是**自由文本**，但会被代码归一化之后再当键用（NFKC、折叠空白与大小写、
剥掉包裹的标点、限长 60 字符）。所以 `存储层` 与 `存储层。` 是同一个题面，
而 `存储层` 与 `数据库` 不是——**同义词不是字符串函数的事**，那要由模型提议、
由人确认。

## 示例

````markdown
---
schema_version: 1
id: state_01M6QGCKZ0K58JW6B7TYNM9X5Q
type: state
status: active
created: "2026-11-06"
last_confirmed: "2026-11-06"
supersedes: null
origin_incident: null
subject: "索引层的存储后端"
sources:
  - "file://examples/sources/conversation.md#t:索引层用本地 SQLite"
sensitivity: internal
confidence: 0.8
---

# 存储后端选本地 SQLite + 文件

## 当前状态

用 Node 内置的 `node:sqlite` 做索引层，不引入第三方驱动。
````

## 与其他类型的边界

- 它是**现在是什么样**，不是**当时怎么决定的**（那是 `decision`）。
- 它不是**发生过什么**（那是 `event`）：发生过的事不该被"更新"，而状态必须能被更新。
- 「过期」只对本类型有意义。这就是新鲜度只挂在 `state` 上的原因。
- 一次**冲突处理**会留下两代状态：新的那条带 `supersedes: <旧 id>`，
  旧的那条把 `status` 改成 `superseded`（正文与出处一个字节都不动）。
  所以"当前状态"的口径是 **`status: active` 的那一条**。

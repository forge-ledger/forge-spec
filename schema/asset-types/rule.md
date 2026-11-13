# rule · 模板

**写规则：就地替换，而且必须绑一次事故。** 这是分类法里唯一**强制溯源**的类型。

`origin_incident`（**必填**）指向触发这条规则的那个**具体的**问题——不是
"我们一直觉得应该这样"，是"某天因为没这样，出了这件事"。

**为什么把它写进 schema 而不是写进文档**：原则只有在被 schema 强制时才算数（反模式 2）。
`AGENTS.md` 里那句"每一行都能追溯到一个具体出过的问题"如果不带执行体，
它就会像所有 checklist 一样被跳过——而跳过它的方式不是故意违抗，是没人记得。

| 章节 | 说明 |
|---|---|
| 规则 | 一句话说清**不许做错什么**。不是"建议如何"，是"否则一定会错" |
| 强制 | 它靠什么被执行。**没有执行体的规则等于礼貌建议**——写"要注意"等于没写 |

`requires_fields`：`origin_incident`。`requires_sections`：`规则`、`强制`。

`subject` 对本类型是**可选**的：两条讲同一件事的规则（比如同一条纪律的两代版本）
填了同一个题面就会被归并到同一个实体。留空不会报错——
规则靠 `origin_incident` 溯源，不靠时间，也不参与冲突判定。

## 示例

````markdown
---
schema_version: 1
id: rule_01M6QGCKYZDMT05VEV396CG75P
type: rule
status: active
created: "2026-11-06"
last_confirmed: "2026-11-06"
supersedes: null
origin_incident: "file://examples/sources/conversation.md#t:规则要绑一次事故"
subject: null
sources:
  - "file://examples/sources/conversation.md#t:规则要绑一次事故"
sensitivity: internal
confidence: 0.9
---

# 不许绕过闸门

## 规则

闸门红了要修**问题**，不是修**闸门**。

## 强制

闸门 1 `B1/B2/B3/B4`（Bash 侧）直接阻断；判定由**基线修订**里的闸门执行，
被检查者改不到检查者。
````

## 为什么规则要少

`AGENTS.md` 的规则上限是 8 条，由闸门机器校验。这**不是**为了让文件好看：
一份 40 条的规则文件不会被执行，只会被忽略——它会增加成本、并且腐化。
规则靠**棘轮**长出来：**每一个错误变成一条规则**，加一条之前先删一条。

## 与其他类型的边界

- 它不是决策：决策是"当时选了哪条路"，规则是"现在必须怎么做"。
- 它不是状态：状态描述世界是什么样，规则规定人该怎么做。
- 它与 `AGENTS.md` 的关系：`rule` 资产**可以**被 emitter 投影进 `AGENTS.md`
  的「规则」一节。本仓库的 `AGENTS.md` 是手写 + 闸门校验的，
  与 emitter 的输出是两条路径——这是有意的，自举（S29）要到 Phase 8 才把它们合起来。

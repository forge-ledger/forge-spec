---
schema_version: 1
id: dec_01M6QGCKYWGDFKGD5J54CTNGZX
type: decision
status: accepted
created: "2026-11-06"
last_confirmed: "2026-11-06"
supersedes: null
origin_incident: null
subject: "v1 定几种资产类型"
sources:
  - "file://examples/sources/conversation.md#t:只定四种资产类型"
  - "file://examples/sources/conversation.md#h:2026-11-06"
sensitivity: internal
confidence: 0.9
---

# 分类法 v1 只定四种资产

## 问题

资产类型应该按业务域切分，还是按写规则切分？按业务域会让类型数量随着产品
功能增长，而每一种新类型都会给目录、索引与检索增加一条分支。

## 考虑过的选项

1. **按业务域切分**：决策、状态、事件、规则、待办、监控项、剧本……
   类型会继续增长，而"两个类型其实写规则相同"的问题会反复出现。
2. **按写规则切分**：只保留四种写规则不同的类型；写规则相同的东西合并。
3. **只保留自由文本**：放弃类型，靠全文检索。代价是无法机器判定必填字段与冲突。

## 选定

**按写规则切分，v1 只定四种**：`decision`、`state`、`event`、`rule`。
判据是：类型是目录分区、索引键与检索路由的公共键；多一种类型，所有下游都多一条分支。

## 后果

- **好**：每种类型对应一种明确的写规则，必填字段与必填章节可以被机器检查。
- **代价**：某些业务概念没有专属类型，需要归到最接近的写规则里。
- **残余风险**：未来出现真正不同的写规则时，加类型是一次主版本迁移，
  而不是随手加一行。

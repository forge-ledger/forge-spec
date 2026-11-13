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

# 规则要能追溯到一次事故

## 规则

每一条规则都必须指向一个具体的、真实发生过的问题。不是"我们一直觉得应该这样"，
而是"某天因为没这样，出了这件事"。

## 强制

`origin_incident` 是 `rule` 类型的必填字段，由校验器检查。没有指向事故的规则
会被判为 `REQUIRED_FIELD_MISSING`，而不是被当成一条善意的建议。

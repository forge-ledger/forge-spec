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
  - "file://examples/sources/conversation.md#t:2026-10-03 误提交事故"
sensitivity: internal
confidence: 1
---

# 2026-10-03 误提交事故

线上账本的一个数据目录被误提交进分支。撤回本身不复杂，麻烦的是从此所有人都
知道检查可以被绕过。这次事故直接长出两条纪律：用户数据永不进版本控制，
以及检查必须由机器执行而不是靠提醒。

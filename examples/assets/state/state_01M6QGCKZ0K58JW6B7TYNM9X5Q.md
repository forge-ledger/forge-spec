---
schema_version: 1
id: state_01M6QGCKZ0K58JW6B7TYNM9X5Q
type: state
status: active
created: "2026-11-06"
last_confirmed: "2026-11-06"
supersedes: null
origin_incident: null
subject: "索引层存储后端"
sources:
  - "file://examples/sources/conversation.md#t:索引层用本地 SQLite"
sensitivity: internal
confidence: 0.8
---

# 索引层用本地 SQLite

## 当前状态

索引层使用本地 SQLite 文件，不引入第三方数据库驱动。它是派生数据，
删掉之后可以从来源与资产重建。

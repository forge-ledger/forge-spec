> **参考翻译（informative）**：本文件是英文规范的参考翻译，可能滞后。
> 如有冲突，以仓库根目录的英文版为准。

# Forge Ledger Format · v1

**一种把会话、文档与决策编译成「带类型、带出处、可维护的资产库」的本地格式规范。**

这份仓库只定义格式，不包含参考实现、托管服务或评测集。

- **本地优先**：格式围绕一个普通目录设计，不需要数据库服务、账号或网络。
- **出处是硬约束**：没有出处的断言不允许进入资产层。
- **可逐字节重算**：同样的输入必须产出同样的字节；时间戳与随机数不进输出。
- **可迁移**：版本号只有一个，旧资产有明确的迁移通道。

## 30 秒理解

账本分三层：

| 层 | 可写？ | 内容 |
|---|---|---|
| `sources/` | 只读、只追加 | 原始来源（会话导出、文档、工单），不可变 |
| `assets/` | 可写 | 编译后的决策 / 状态 / 事件 / 规则，每条带出处 |
| `index/` | 可重建 | 从来源与资产派生的索引，删掉可以重算 |

一条资产是一个 Markdown 文件：YAML front-matter 放结构，正文放人读的内容。

```markdown
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
sensitivity: internal
confidence: 0.9
---

# 分类法 v1 只定四种资产

## 问题
……
```

## 仓库内容

```
README.md              本文件
LICENSE                分层许可说明
LICENSES/              完整许可文本（CC0 / CC-BY / AGPL）
zh/                    中文参考翻译（informative，非权威）
specification.md       规范正文：层模型、类型、字段、校验规则
ids.md                 ID 形状与取值来源
provenance.md          出处 span 语法与规则
schema.json            front-matter v1 的 JSON Schema
schema/taxonomy.yaml   机器可读的分类法
schema/asset-types/    四种资产的模板与边界
examples/              合成的示例账本（可被 validate.mjs 校验）
validate.mjs           零依赖校验器
dco.mjs                零依赖 DCO 检查（CI 用）
decisions/             公开的规范决策记录
GLOSSARY.md            术语表（英文 ↔ 中文）
CHANGELOG.md           规范变更记录
GOVERNANCE.md          变更流程与版本策略
CONTRIBUTING.md        如何贡献
CODE_OF_CONDUCT.md     行为准则
SECURITY.md            如何私下报告安全问题
TRADEMARKS.md          商标与品牌
.github/               issue / PR 模板与 CI
```

## 快速开始

以下命令都在**仓库根目录**执行（本目录是参考翻译，不含校验器本身）。

要求 Node.js 24 或更高版本（只用内置模块，没有依赖）。

```bash
node validate.mjs             # 校验 schema、taxonomy 与 examples
node validate.mjs --self-test # 显式要求自证（默认也会跑）
```

`validate.mjs` 做四件事：

1. 用 `schema.json` 校验每条示例的 front-matter；
2. 用 `schema/taxonomy.yaml` 校验机器可读部分没有漂移；
3. 检查 ID 前缀、必填字段、必填章节、日期与 span 是否真的能解析，
   并校验 `VERSION` 的主版本与格式版本一致；
4. 跑一组变异样例，证明每一条检查都会红——只会变绿的检查不是检查
   （包括版本号不一致、`VERSION` 格式非法、`VERSION` 为空）。

## 四条不能让步的规则

1. **没有出处的断言不许进 `assets/`。**
   出处是硬约束，不是元数据奢侈品。无法校验的 scheme 必须报「无法校验」，
   不能报「通过」。
2. **外部证据先落进 `sources/`，再用 `src://` 引用。**
   URL、工单、线上日志不能直接当 span：出处会随外部世界腐烂，而腐烂的出处
   比没有出处更糟——它看起来像证据。
3. **冲突不自动覆盖。**
   判定可以产出候选，但改写已有资产必须由人触发，并留下日期与理由。
4. **输出逐字节确定。**
   不写时间戳、随机数、本机时区或换行符差异进产物。

## 什么不在本仓库

这份仓库刻意**不**包含：

- 参考实现的源代码；
- 用于给实现打分的评测集、阈值与回归用例；
- 任何真实会话、客户数据或"脱敏样例"；
- 托管服务、遥测或账号系统；
- 未来的路线图日期。

如果你需要实现，请按本规范自行实现；规范本身不绑定任何一家实现。

## 版本与兼容性

- **格式版本**：`schema/taxonomy.yaml` 里的整数，当前为 `1`。每条资产的
  `schema_version` 必须等于它。
- **发布版本**：`VERSION` 里的 `x.y.z`，当前为 `1.0.0`，对应标签
  `spec-vX.Y.Z`。它只标记规范的发布批次。
- **映射**：发布版本的主版本号必须等于格式版本（`1.0.0` ↔ 格式 v1）。
  `validate.mjs` 会校验这一点，不一致时报 `VERSION_MISMATCH`。
- 不兼容变更必须升格式版本并提供迁移说明，发布版本随之升主版本。
- 兼容的澄清、示例增补只更新文档与发布版本的次/修订号。

## 许可

- 规范、分类法与示例：**CC0-1.0**（`LICENSES/CC0-1.0.txt`）。
- 文档：**CC-BY-4.0**（`LICENSES/CC-BY-4.0.txt`）。
- 参考实现（不在此仓库）：**AGPL-3.0-only**（`LICENSES/AGPL-3.0-only.txt`）。

规范采用最宽松的许可，是因为标准的第一要求是零摩擦；参考实现采用 AGPL，
是为了防止 fork 后做闭源托管。两者不是同一层，不要混为一谈。

## 安全

请不要在 issue 里贴真实会话或客户数据。安全问题请走
`/security/advisories/new`；响应承诺见 `SECURITY.md`。

## 贡献

规范变更需要 RFC；示例必须是合成的；提交必须通过 `node validate.mjs`。
详见 `CONTRIBUTING.md` 与 `GOVERNANCE.md`。

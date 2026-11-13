# Glossary

This table fixes the English terminology used by the specification and the Chinese
reference translation. If a translation disagrees with this table, the English term
is normative.

| English | Chinese | Notes |
|---|---|---|
| ledger | 账本 | the whole vault |
| source | 来源 | the read-only `sources/` layer |
| asset | 资产 | a compiled entry in `assets/` |
| provenance | 出处 | evidence that an assertion came from somewhere |
| span | span（引用区间） | `scheme://target#anchor` |
| anchor | 锚点 | `#h:` / `#t:` / `#k:` / `#L` |
| heading anchor | 标题锚点 | `#h:` |
| text span | 原文片段锚点 | `#t:` |
| key path | 键路径锚点 | `#k:` |
| line range | 行区间锚点 | `#L` |
| subject | 题面 | required on `state`; what the state is about |
| decision | 决策 | append-only, immutable after `accepted` |
| state | 状态 | replace in place; expires |
| event | 事件 | append-only; something that happened |
| rule | 规则 | replace in place; requires `origin_incident` |
| write rule | 写规则 | the criterion that separates asset types |
| append-only | 只追加 | never edit in place |
| replace in place | 就地替换 | supersede through a new generation |
| supersede | 取代 | the new asset points at the old ID |
| candidate | 候选 | a proposed change, not applied automatically |
| freshness | 新鲜度 | whether a `state` is still current |
| taxonomy | 分类法 | `schema/taxonomy.yaml` |
| format version | 格式版本 | the integer in the taxonomy |
| release version | 发布版本 | `x.y.z` in `VERSION` |
| migration | 迁移 | moving old assets to a new format version |
| validator | 校验器 | `validate.mjs` |
| unverifiable | 无法校验 | distinct from "pass" |
| byte-for-byte deterministic | 逐字节确定 | identical input, identical bytes |
| content-addressed | 内容寻址 | an ID derived from content |
| required field | 必填字段 | required by the asset type |
| required section | 必填章节 | required by the asset type |
| gate | 闸门 | an automated enforcement point (used in internal docs) |

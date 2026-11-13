> **参考翻译（informative）**：本文件是英文规范的参考翻译，可能滞后。
> 如有冲突，以仓库根目录的英文版为准。

# 术语表

本表固定规范英文版与中文参考翻译的对应关系。如果翻译与本表冲突，以英文术语为准。

| 英文 | 中文 | 备注 |
|---|---|---|
| ledger | 账本 | 整个 vault |
| source | 来源 | 只读的 `sources/` 层 |
| asset | 资产 | `assets/` 里的编译产物 |
| provenance | 出处 | 断言来自某处的证据 |
| span | span（引用区间） | `scheme://target#anchor` |
| anchor | 锚点 | `#h:` / `#t:` / `#k:` / `#L` |
| heading anchor | 标题锚点 | `#h:` |
| text span | 原文片段锚点 | `#t:` |
| key path | 键路径锚点 | `#k:` |
| line range | 行区间锚点 | `#L` |
| subject | 题面 | `state` 必填；这条状态讲的是哪件事 |
| decision | 决策 | 只追加；`accepted` 后不可变 |
| state | 状态 | 就地替换；会过期 |
| event | 事件 | 只追加；发生过的事 |
| rule | 规则 | 就地替换；必须有 `origin_incident` |
| write rule | 写规则 | 划分资产类型的判据 |
| append-only | 只追加 | 不允许原地修改 |
| replace in place | 就地替换 | 通过新一代取代 |
| supersede | 取代 | 新资产指向旧 ID |
| candidate | 候选 | 提议，不自动应用 |
| freshness | 新鲜度 | `state` 是否仍然成立 |
| taxonomy | 分类法 | `schema/taxonomy.yaml` |
| format version | 格式版本 | 分类法里的整数 |
| release version | 发布版本 | `VERSION` 里的 `x.y.z` |
| migration | 迁移 | 把旧资产移到新的格式版本 |
| validator | 校验器 | `validate.mjs` |
| unverifiable | 无法校验 | 与「通过」是两种输出 |
| byte-for-byte deterministic | 逐字节确定 | 同样输入，同样字节 |
| content-addressed | 内容寻址 | 由内容派生的 ID |
| required field | 必填字段 | 资产类型要求的字段 |
| required section | 必填章节 | 资产类型要求的章节 |
| gate | 闸门 | 自动强制点（用于内部文档） |

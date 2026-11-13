> **参考翻译（informative）**：本文件是英文规范的参考翻译，可能滞后。
> 如有冲突，以仓库根目录的英文版为准。

# Forge Ledger Format v1 · 规范正文

> 状态：稳定。格式版本：1（发布版本见 `VERSION`）。机器可读部分见
> `../schema/taxonomy.yaml` 与 `../schema.json`。

## 1. 范围

本规范定义一种**本地账本**的文件格式：把来源编译成带类型、带出处、可维护的资产。

它只定义文件与语义，不定义：

- 编译器如何抽取（那属于实现）；
- 如何打分（那属于评测）；
- 如何在网络上同步（v1 不涉及）。

## 2. 三层模型

账本根目录下有三个子目录：

```
<vault>/
├── sources/   只读、只追加；原始来源不可变
├── assets/    可写；编译后的资产
└── index/     可重建；从 sources 与 assets 派生
```

### 2.1 `sources/`

- 每个来源一个目录，目录名是来源 ID（`src_` + 26 位 base32）。
- 来源内容一旦写入，**不允许原地修改**。内容变了就是另一个来源。
- 来源可以来自文件、导出包或采集器；v1 只要求它可被稳定读取。

### 2.2 `assets/`

- 按 ID 前缀分区：`assets/dec/`、`assets/state/`、`assets/event/`、`assets/rule/`。
- 每条资产是一个 Markdown 文件，front-matter 是结构，正文是人读内容。
- 资产的集合由目录约定决定，不维护额外的清单文件。

### 2.3 `index/`

- 索引是**派生数据**，删掉必须能重建。
- 索引里的条目不是资产；它们可以被重算，因此不参与出处与审计规则。

## 3. 资产类型

类型按**写规则**划分，不按业务域划分。写规则相同的东西不应该是两种类型。

| 类型 | 前缀 | 写规则 | 额外必填字段 | 必填章节 | 会过期？ |
|---|---|---|---|---|---|
| `decision` | `dec_` | 只追加；`accepted` 后不可变 | 无 | 问题 / 考虑过的选项 / 选定 / 后果 | 否 |
| `state` | `state_` | 就地替换 | `last_confirmed`、`subject` | 当前状态 | **是**（30 天） |
| `event` | `event_` | 只追加 | 无 | 无 | 否 |
| `rule` | `rule_` | 就地替换 | `origin_incident` | 规则 / 强制 | 否 |

### 3.1 为什么只有四种

- `decision` 绑定"它发生在那一刻"；事后重写就是编造理由。要改就新建一条并 `supersedes` 旧的。
- `state` 的失败模式不是"写错了"，是"过期了但看起来仍然有效"。所以它必须有日期。
- `event` 是发生过的事；改一条事件就是篡改历史。要修正就追加一条更正。
- `rule` 只能从真实错误长出来；`origin_incident` 把这条纪律写进结构。

### 3.2 `subject` 与冲突

`state` 必须带 `subject`（题面）。题面缺失意味着这条状态**不参与冲突判定**，
而"我确认过的状态不会被后续事件挑战"是这个格式最不能出的静默故障。

题面是自由文本，但实现必须在使用前做归一化：NFKC、折叠空白与大小写、
剥掉包裹标点、限制长度（本规范建议 60 字符）。同义词不是字符串函数的事，
那需要模型提议并由人确认。

## 4. front-matter

每条资产必须以 `---` 开头，以单独一行的 `---` 结束。字段全集：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `schema_version` | integer | 是 | 规范版本；必须等于分类法版本 |
| `id` | string | 是 | `<类型前缀>_<26 位 base32>` |
| `type` | enum | 是 | `decision` / `state` / `event` / `rule` |
| `status` | enum | 是 | `proposed` / `accepted` / `superseded` / `active` / `retired` / `recorded` |
| `created` | date | 是 | `YYYY-MM-DD`，写下的日期 |
| `last_confirmed` | date \| null | `state` 必填 | 最后一次确认它仍然成立 |
| `supersedes` | string \| null | 否 | 被本条取代的资产 ID |
| `origin_incident` | string \| null | `rule` 必填 | 触发这条规则的那次事故（一个 span） |
| `subject` | string \| null | `state` 必填 | 这条资产讲的是哪一件事 |
| `sources` | string[] | 是 | 出处 span 列表；空列表是审核错误，不是解析错误 |
| `sensitivity` | enum | 是 | `public` / `internal` / `private` |
| `confidence` | number | 是 | 0..1；模型产物必须从低置信度起步 |

未列出的字段在 v1 里被忽略；实现不得因为未知字段而拒收整条资产。

日期必须是**真实存在的日历日期**（`2026-02-30` 不合法），不是"能被正则匹配"。

## 5. ID

形状：

```
<前缀>_<26 位 Crockford base32>
```

- 字符表：`0123456789ABCDEFGHJKMNPQRSTVWXYZ`（不含 `I`、`L`、`O`、`U`）。
- 解析时先归一化：`I`/`L` → `1`，`O` → `0`，大小写不敏感。
- 前缀必须与 `type` 一致。

取值来源：

| 对象 | 取值 | 理由 |
|---|---|---|
| `src_` | `SHA-256(原始字节)` 前 128 位 | 同一份导出重复导入必须命中同一个来源 |
| `event_` | `SHA-256(source_id + key + text)` | 两次运行必须得到同一个 ID |
| `dec_` / `state_` / `rule_` | ULID | 它们需要"何时被写下"的语义 |

派生 ID 里没有时间。时间进 ID 会让输出每次不同，快照与审计就失去执行体。

## 6. 出处

span 语法：

```
span   := scheme "://" target [ "#" anchor ]
scheme := "file" | "src"
anchor := "h:" 标题 | "t:" 原文片段 | "k:" 键路径 | "L<起>-L<止>"
```

- `file://` 指向工作区里的文件；规范仓库的示例全部使用这一种。
- `src://` 指向 `sources/` 层里的来源；需要实现提供结构化解析。
- 比较前把空白折叠成单个空格。
- `#t:` 片段至少 8 个字符；太短的片段会在任何文档里命中，那不是证据。
- `#h:` 指向一个 ATX 标题；`#L` 是 1 基、闭区间。
- `#k:` 指向结构化来源里的一条记录；由来源连接器确认键存在。

两条硬规则：

1. **没有出处的断言不许进 `assets/`。**
2. **外部证据先落进 `sources/`，再用 `src://` 引用。** URL 不能直接当 span。

「无法校验」与「校验通过」必须是两种不同的输出。v1 不允许把无法校验的 scheme
静默算作通过。

## 7. 新鲜度

- 只有 `state` 会过期，默认窗口 30 天。
- 过期不是提交闸门：闸门的判据必须只依赖输入，而新鲜度依赖"今天"。
  它是维护任务的职责，由实现单独运行。
- 实现不得提供"自动确认"：自动刷新会让库永远看起来新鲜，而"过期"是这套格式
  唯一有价值的维护信号。

## 8. 冲突

- 判定可以产出**候选**与证据，但不得自动改写已有资产。
- 改写只能由人触发，必须带日期与理由。
- 结果是**新一代状态**：新条目的 `supersedes` 指向旧 ID，旧条目的 `status`
  改成 `superseded`，正文与出处一个字节都不动。
- 因此"当前状态"的口径是 `status: active` 的那一条。

## 9. 校验顺序

实现应当按以下顺序判定，因为码不同、修法也不同：

1. **front-matter 形状**（字段、类型、值域）→ `ASSET_FRONTMATTER_INVALID`
2. **版本**（`schema_version` 与分类法不一致）→ `SCHEMA_VERSION_MISMATCH`
3. **ID 前缀**（与 `type` 不一致）→ `ID_PREFIX_MISMATCH`
4. **出处**（没有 sources / span 解析不到 / scheme 不可校验）→
   `PROV_NO_SOURCES` / `PROV_SPAN_UNRESOLVED` / `PROV_SCHEME_UNAVAILABLE`
5. **必填字段与章节**（分类法要求的）→ `REQUIRED_FIELD_MISSING` / `REQUIRED_SECTION_MISSING`
6. **新鲜度**（只在维护任务里）→ `FRESHNESS_EXPIRED`

合并码等于合并修法。`PROV_NO_SOURCES` 与 `PROV_SPAN_UNRESOLVED` 必须是两个码：
一个让你去补证据，另一个让你去修 span。

## 10. 确定性与兼容性

- 输出必须逐字节确定：键序写死、换行只用 `\n`、不写时间戳与随机数。
- 格式版本只有一个整数。发布版本（`VERSION`）不是第二个格式版本；它只标记
  发布批次。
- 不兼容变更必须升主版本，并提供迁移说明。
- v1 不定义网络同步、权限或并发；这些属于实现或后续版本。

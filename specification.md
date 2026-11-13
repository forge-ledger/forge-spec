# Forge Ledger Format v1 · Normative specification

> Status: stable. Format version: 1 (release version: see `VERSION`). The
> machine-readable parts are `schema/taxonomy.yaml` and `schema.json`.

## 1. Scope

This specification defines a file format for a **local ledger**: sources are
compiled into typed, provenance-backed, maintainable assets.

It defines files and semantics only. It does not define:

- how a compiler extracts assets (that belongs to an implementation);
- how to score an implementation (that belongs to evaluation);
- how to synchronize over a network (out of scope for v1).

## 2. Three-layer model

A ledger root has three subdirectories:

```
<vault>/
├── sources/   read-only, append-only; raw sources are immutable
├── assets/    writable; compiled assets
└── index/     rebuildable; derived from sources and assets
```

### 2.1 `sources/`

- One directory per source. The directory name is the source ID (`src_` plus 26
  base32 characters).
- Once written, source content **must not be modified in place**. Changed content is
  a different source.
- A source may come from a file, an export bundle, or a collector; v1 only requires
  that it can be read deterministically.

### 2.2 `assets/`

- Partitioned by ID prefix: `assets/dec/`, `assets/state/`, `assets/event/`,
  `assets/rule/`.
- Each asset is a Markdown file: front-matter is structure, the body is
  human-readable content.
- The asset set is determined by directory convention; no extra manifest file is
  maintained.

### 2.3 `index/`

- The index is **derived data**; deleting it must be recoverable by rebuilding.
- Index entries are not assets. They can be recomputed, so they are not subject to
  provenance or audit rules.

## 3. Asset types

Types are divided by **write rule**, not by business domain. Two things with the
same write rule should not be two types.

| Type | Prefix | Write rule | Extra required fields | Required sections | Expires? |
|---|---|---|---|---|---|
| `decision` | `dec_` | append-only; immutable after `accepted` | none | 问题 / 考虑过的选项 / 选定 / 后果 | no |
| `state` | `state_` | replace in place | `last_confirmed`, `subject` | 当前状态 | **yes** (30 days) |
| `event` | `event_` | append-only | none | none | no |
| `rule` | `rule_` | replace in place | `origin_incident` | 规则 / 强制 | no |

The "Required sections" column lists literal v1 section titles in Chinese. They are
part of the v1 wire format; an implementation must match them exactly.

### 3.1 Why only four

- A `decision` is bound to "the moment it happened"; rewriting it afterwards
  manufactures a rationale. To change it, create a new decision and let it
  `supersedes` the old one.
- The failure mode of a `state` is not "it was written incorrectly" but "it expired
  while still looking valid". Therefore it must carry a date.
- An `event` is something that happened; editing an event falsifies history. To
  correct it, append a correction.
- A `rule` can only grow out of a real error; `origin_incident` writes that
  discipline into the structure.

### 3.2 `subject` and conflicts

A `state` must carry a `subject`. A missing subject means the state **does not
participate in conflict detection**, and "a state I confirmed will not be silently
challenged by later events" is the silent failure this format can least afford.

The subject is free text, but implementations must normalize it before use: NFKC,
collapse whitespace and case, strip wrapping punctuation, and limit length (this
specification recommends 60 characters). Synonym resolution is not a string
function; it requires a model proposal confirmed by a human.

## 4. Front-matter

Every asset must start with `---` and end with `---` on its own line. The complete
field set:

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema_version` | integer | yes | format version; must equal the taxonomy version |
| `id` | string | yes | `<type prefix>_<26 base32 characters>` |
| `type` | enum | yes | `decision` / `state` / `event` / `rule` |
| `status` | enum | yes | `proposed` / `accepted` / `superseded` / `active` / `retired` / `recorded` |
| `created` | date | yes | `YYYY-MM-DD`, the date it was written |
| `last_confirmed` | date \| null | required for `state` | the last date it was confirmed still true |
| `supersedes` | string \| null | no | the ID of the asset this one replaces |
| `origin_incident` | string \| null | required for `rule` | the incident that triggered this rule (a span) |
| `subject` | string \| null | required for `state` | what this asset is about |
| `sources` | string[] | yes | provenance spans; an empty list is a review error, not a parse error |
| `sensitivity` | enum | yes | `public` / `internal` / `private` |
| `confidence` | number | yes | 0..1; model output must start at low confidence |

Fields not listed here are ignored in v1; an implementation must not reject an
entire asset because of an unknown field.

Dates must be **real calendar dates** (`2026-02-30` is invalid), not merely strings
that match a regular expression.

## 5. IDs

Shape:

```
<prefix>_<26 Crockford base32 characters>
```

- Alphabet: `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (no `I`, `L`, `O`, `U`).
- Normalize before parsing: `I`/`L` → `1`, `O` → `0`, case-insensitive.
- The prefix must match `type`.

Value derivation:

| Object | Value | Why |
|---|---|---|
| `src_` | first 128 bits of `SHA-256(raw bytes)` | importing the same export twice must hit the same source |
| `event_` | `SHA-256(source_id + key + text)` | two runs must produce the same ID |
| `dec_` / `state_` / `rule_` | ULID | they need the semantics of "when it was written" |

Derived IDs contain no time. Time in an ID makes output differ on every run, and
snapshots and audits lose their execution body.

## 6. Provenance

Span syntax:

```
span   := scheme "://" target [ "#" anchor ]
scheme := "file" | "src"
anchor := "h:" heading | "t:" text fragment | "k:" key path | "L<start>-L<end>"
```

- `file://` points to a file in the workspace; all examples in this repository use
  this scheme.
- `src://` points to a source in the `sources/` layer; the implementation must
  provide structured resolution.
- Collapse whitespace to a single space before comparison.
- A `#t:` fragment is at least 8 characters; a shorter fragment matches any
  document, and that is not evidence.
- `#h:` points to an ATX heading; `#L` is 1-based and inclusive.
- `#k:` points to a record in a structured source; the source connector must confirm
  that the key exists.

Two hard rules:

1. **Assertions without provenance must not enter `assets/`.**
2. **External evidence lands in `sources/` first, then is referenced with `src://`.**
   A URL cannot be used directly as a span.

"Unverifiable" and "pass" must be two different outputs. v1 does not allow an
unverifiable scheme to be silently counted as a pass.

## 7. Freshness

- Only `state` expires; the default window is 30 days.
- Expiry is not a commit gate: a gate's verdict must depend only on its input, while
  freshness depends on "today". It is the job of a maintenance task, run separately
  by the implementation.
- Implementations must not provide "auto-confirm": automatically refreshing
  `last_confirmed` makes the library look fresh forever, while "expired" is the only
  valuable maintenance signal in this format.

## 8. Conflicts

- A judge may produce **candidates** and evidence, but must not rewrite an existing
  asset automatically.
- Rewriting can only be triggered by a human and must carry a date and a reason.
- The result is a **new generation of state**: the new entry's `supersedes` points to
  the old ID, the old entry's `status` becomes `superseded`, and the old body and
  provenance are not changed by a single byte.
- Therefore "the current state" means the entry with `status: active`.

## 9. Validation order

Implementations should decide in the following order, because different codes imply
different fixes:

1. **front-matter shape** (fields, types, value ranges) →
   `ASSET_FRONTMATTER_INVALID`
2. **version** (`schema_version` differs from the taxonomy version) →
   `SCHEMA_VERSION_MISMATCH`
3. **ID prefix** (differs from `type`) → `ID_PREFIX_MISMATCH`
4. **provenance** (no sources / span does not resolve / scheme is unverifiable) →
   `PROV_NO_SOURCES` / `PROV_SPAN_UNRESOLVED` / `PROV_SCHEME_UNAVAILABLE`
5. **required fields and sections** (as required by the taxonomy) →
   `REQUIRED_FIELD_MISSING` / `REQUIRED_SECTION_MISSING`
6. **freshness** (maintenance tasks only) → `FRESHNESS_EXPIRED`

Merging codes means merging fixes. `PROV_NO_SOURCES` and `PROV_SPAN_UNRESOLVED` must
be two codes: one tells you to add evidence, the other tells you to fix the span.

## 10. Determinism and compatibility

- Output must be byte-for-byte deterministic: fixed key order, `\n` line endings
  only, no timestamps or random values.
- The format version is a single integer. The release version (`VERSION`) is not a
  second format version; it only marks release batches.
- Incompatible changes must bump the format major version and provide migration
  notes.
- v1 does not define network synchronization, permissions, or concurrency; those
  belong to implementations or later versions.

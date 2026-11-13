# Provenance and freshness rules

> This document defines span syntax, resolution rules, and the division of labor
> between verdicts.

## Span syntax

```
span   := scheme "://" target [ "#" anchor ]
scheme := "file" | "src"
anchor := "h:" heading | "t:" text fragment | "k:" key path | "L<start>-L<end>"
```

- `file://` — a file in the workspace/repository. All examples in this repository
  use this scheme.
- `src://` — a source in the `sources/` layer. The implementation must provide
  structured source resolution.
- Collapse whitespace to a single space before comparison. Quoted sentences often
  wrap across lines; byte comparison would invalidate every reference after a single
  reflow. That is not "provenance is a hard constraint", that is "provenance is a
  fragile string comparison".

### Four anchors

| Anchor | Points to | Criterion |
|---|---|---|
| `#h:heading` | an ATX heading | the target file has a heading that is equal after normalization |
| `#t:text fragment` | a text fragment (≥ 8 characters) | the normalized target file **contains** it |
| `#k:key path` | a record in a structured source (`conv_01/msg_03`) | the source connector resolves it and confirms the key exists |
| `#L12-L20` | a line range (1-based, inclusive) | the target file has that many lines |

The 8-character minimum for `#t:` is not arbitrary: a shorter fragment matches any
document. It makes the check **pass**, but that is not evidence. When writing `#t:`,
also avoid cutting the anchor in the middle of Markdown emphasis: `**this**` remains
`**this**` after normalization, so `#t:this` does not match — the anchor must point
to contiguous text that already exists in the document.

`#k:` is the only **structured** anchor in v1. `#t:` is fragile on JSON because an
export escapes quotes, backslashes, and newlines into `\"`, `\\`, and `\n`; the same
sentence is a different string in the original text and in the raw bytes.

## Two non-negotiable rules

1. **Assertions without provenance must not enter `assets/`.** Provenance is a hard
   constraint, not optional metadata.
2. **External evidence lands in `sources/` first, then is referenced with `src://`.**
   URLs, tickets, and production logs cannot be used directly as spans: provenance
   rots with the outside world, and **rotten provenance is worse than none** — it
   looks like evidence.

## Verdicts

The output is red/green, and each code maps to one fix. Merging codes means merging
fixes.

| Code | Meaning | Fix |
|---|---|---|
| `ASSET_FRONTMATTER_INVALID` | invalid front-matter (missing field, wrong type, out of range) | complete the front-matter; see the field table in `schema/taxonomy.yaml` |
| `SCHEMA_VERSION_MISMATCH` | `schema_version` differs from the taxonomy version | run the migration channel; do not paper over it in the checker |
| `ID_PREFIX_MISMATCH` | the ID's type prefix differs from the `type` field | make them the same type; see the prefix table in `ids.md` |
| `PROV_NO_SOURCES` | no `sources`: the assertion has no provenance | add spans |
| `PROV_SPAN_UNRESOLVED` | invalid span syntax, or the target/anchor does not resolve | fix the span: change the quoted text, or point to the place that still exists |
| `PROV_SCHEME_UNAVAILABLE` | this host cannot verify the scheme (for example, no `sources/`) | **this is "unverifiable", not "pass"**; change the scheme, or run it on a host that can verify it |
| `REQUIRED_FIELD_MISSING` | a field required by the type is missing or empty | add it; the requirement lives in the taxonomy, not in docs |
| `REQUIRED_SECTION_MISSING` | a body section required by the type is missing | follow the template in `schema/asset-types/<type>.md` |
| `FRESHNESS_EXPIRED` | a `state` has exceeded its freshness window without confirmation | confirm whether it still holds; if so, update `last_confirmed` |

`PROV_NO_SOURCES` and `PROV_SPAN_UNRESOLVED` **must be two codes**: their fixes
differ (add evidence vs. fix the span). Merging them degrades the output from an
actionable instruction into "an error was reported". `PROV_SCHEME_UNAVAILABLE`
exists separately for a stronger reason: **"unverifiable" and "pass" must be two
different outputs.**

## Provenance is **rebuilt**, not copied

An implementation should not store the provenance strings written by a model or a
human verbatim: parse each one, keep only those that resolve, and re-serialize them
in a uniform format. Reason: the `sources` in an asset and the keys in the index must
be the same string; one space of difference makes the lookup fail, and fail
silently. Rebuilding also deduplicates and sorts (the same evidence stated twice is
not two pieces of evidence; order must be deterministic).

Case variants (`SRC_xxx`) are **not** rebuilt: target comparison is byte-for-byte,
so they are discarded as fabricated provenance. That is intentional — "different
case but looks similar" is exactly the kind of thing a human should look at, and
silent normalization would make it disappear.

## Freshness is attached only to `state`

- `state` expires, so it needs `last_confirmed` plus a window (default 30 days).
- `decision` is immutable once `accepted`; `event` is something that happened;
  `rule` is traced through `origin_incident`, not through time. Giving them expiry
  dates only creates a check with no content, and a check with no content gets
  skipped.
- **Freshness is deliberately not part of the commit gate**: its verdict must depend
  only on its input, while freshness depends on "today". Putting a clock into the
  check makes an untouched asset turn red one morning, and the reason is "time
  passed" — that is a maintenance task and should run separately.
- Implementations must not provide "auto-confirm": automatic refreshing makes the
  library look fresh forever.

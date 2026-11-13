# ID scheme

> This document defines the shape of IDs and how their values are derived. The
> machine-readable prefix table is `schema/taxonomy.yaml`.

## Shape

```
<prefix>_<26 Crockford base32 characters>
```

- **The prefix is part of the ID, not just a field.** This makes `grep`, prefix-based
  directory partitioning, and type recognition in logs all work. Type information in
  two places is harder to lose than in one.
- **26 characters**, fixed length: 130 bits (128 bits used, with two zero bits
  appended). A fixed length keeps regexes and partitioning simple.
- **Crockford base32**: `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
  It excludes `I`, `L`, `O`, `U`: the first three are easy to confuse with `1` and
  `0` when copied by hand, and `U` is excluded entirely to avoid accidental profanity.
  Normalize before comparing: `I`/`L` → `1`, `O` → `0`, case-insensitive. Without
  this step, references such as `supersedes` **silently break** because of
  hand-copying differences.

## Prefix table

| Prefix | Meaning | Partition directory | Notes |
|---|---|---|---|
| `dec_` | decision | `assets/dec/` | immutable after `accepted` |
| `state_` | state | `assets/state/` | replace in place; must carry a date |
| `event_` | event | `assets/event/` | append-only |
| `rule_` | rule | `assets/rule/` | replace in place; must bind `origin_incident` |
| `src_` | source (**not an asset type**) | `sources/src_.../` | read-only layer |

The prefix table itself lives in `asset_types.*.prefix` in `schema/taxonomy.yaml`,
not in code comments: a type and its prefix must change together, and maintaining
them in two places inevitably drifts.

## Value derivation: content-addressed when recomputable, ULID otherwise

There is only one criterion: **can this thing be recomputed?**

| | Recomputable? | Value | Why |
|---|---|---|---|
| `src_` (source) | no (raw bytes) | first 128 bits of `SHA-256(raw bytes)` | importing the same export twice must hit the same source; otherwise events double |
| `event_` (event) | yes (sources + connector) | `SHA-256(source_id + key + text)` | two runs must produce the same ID |
| `dec_` / `state_` / `rule_` | no (contains human judgment) | ULID (48-bit milliseconds + 80-bit random) | they need the semantics of "when it was written" |

**Derived IDs contain no time.** A timestamp in the output makes every run different,
snapshot tests have to be disabled, and "determinism" loses its execution body. The
ordering of events is carried by `occurred_at` (from the export itself); "what time
the compilation ran" has no value to a consumer.

## Known costs

- Lexicographic order of derived IDs no longer equals chronological order.
  Compensation: the event sort key is explicitly `(occurred_at descending, ID)`.
- Changing one character changes a content-addressed ID. For immutable data this is
  correct, but it means "editing an event" equals "creating a new one + orphaning the
  old one" — intentional friction.
- IDs are long (prefix + 26 characters) and less pleasant to read than short numbers.
  That is the price of "offline generation + sortability".

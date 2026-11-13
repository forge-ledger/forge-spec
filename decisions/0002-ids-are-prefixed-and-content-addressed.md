# 0002 · Prefix + 26 base32 characters; content-addressed when recomputable

## Problem

When and by whom should an ID be generated? If an ID contains time, output is not
deterministic; if it does not, how do we guarantee that processing the same input
twice produces the same result?

## Options considered

1. **Auto-incrementing integers**: require a central allocator; unusable offline.
2. **Pure random UUIDs**: re-importing creates new IDs, doubling events and sources.
3. **Prefix + content/random hybrid**: content-addressed when recomputable, ULID
   otherwise.
4. **Pure timestamp**: output is non-deterministic; snapshots and audits lose their
   execution body.

## Decision

- Shape: `<type prefix>_<26 Crockford base32 characters>`.
- Recomputable objects (sources, events) use content addressing: the same input must
  produce the same ID.
- Objects containing human judgment (decisions, states, rules) use ULIDs: they need
  the semantics of "when it was written".
- **Derived IDs contain no time**; time is carried by business fields.

## Consequences

- **Good**: offline generation; idempotent re-import; simple grep and directory
  partitioning.
- **Cost**: changing one character changes the ID; "editing an event" equals
  "creating a new one + orphaning the old one".
- **Residual risk**: IDs are long and less pleasant to read than short numbers.

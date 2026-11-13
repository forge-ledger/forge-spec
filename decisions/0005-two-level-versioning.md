# 0005 · Format version and release version are two layers

## Problem

The specification needs a version number, but "can this file be read" and "what was
released" are two different questions. A single `1.0.0` makes implementers think
`schema_version` should also be `1.0.0`; a single integer cannot mark release
batches. Both need to be expressed, without collapsing them into one field.

## Options considered

1. **Keep only the format version (integer)**: simple, but release batches can only
   be expressed by a git tag, with no checkable relationship between the file and
   the tag.
2. **Keep only the release version (`x.y.z`)**: semantically clear, but every
   asset's `schema_version` becomes three segments while implementations only care
   about the major.
3. **Two layers with an explicit mapping**: the format version is an integer, the
   release version is `x.y.z`, and their majors must be equal.

## Decision

Both layers exist:

- **Format version**: `version` in `schema/taxonomy.yaml` (currently `1`), also
  written into each asset's `schema_version`. It determines whether a file can be
  read.
- **Release version**: the `x.y.z` in `VERSION` (currently `1.0.0`), corresponding
  to the tag `spec-vX.Y.Z`. It only marks a release batch.
- **Mapping**: the release major version must equal the format version
  (`1.0.0` ↔ format v1). `validate.mjs` checks this and reports
  `VERSION_MISMATCH` or `VERSION_INVALID` when it does not hold.

Incompatible changes bump the format version and include migration notes; the
release major follows. Compatible clarifications and additional examples only update
documentation and the release minor/patch.

## Consequences

- **Good**: implementers only need the integer; the release process has a
  machine-checkable tag relationship.
- **Cost**: an extra `VERSION` file and a "two layers must align" check.
- **Residual risk**: `VERSION` cannot replace migration notes; it proves a release
  batch, not compatibility.

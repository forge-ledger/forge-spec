# Changelog

This file records changes to the **specification** only. Changes to a reference
implementation are out of scope for this repository.

## 1.0.0

First public release. Defines:

- the three-layer data model: `sources/` (read-only raw material), `assets/`
  (writable assets), `index/` (rebuildable index).
- four asset types: `decision`, `state`, `event`, `rule`, each with its write rule,
  required fields, and required sections.
- the complete v1 front-matter field set and its JSON Schema.
- the ID shape: `<type prefix>_<26 Crockford base32 characters>`.
- provenance span syntax: `scheme://target#anchor`, with four anchors
  (`#h:` / `#t:` / `#k:` / `#L`).
- freshness attached only to `state`.
- a zero-dependency example validator (`validate.mjs`).

## Version policy

Versions have two layers with different meanings:

- **Format version**: the integer in `schema/taxonomy.yaml` (currently `1`), also
  written into each asset's `schema_version`. It determines whether a file can be
  read.
- **Release version**: the `x.y.z` in `VERSION` (currently `1.0.0`), corresponding
  to the tag `spec-vX.Y.Z`. It only marks a release batch.

The two must align: the release major version equals the format version
(`1.0.0` ↔ format v1). `validate.mjs` checks this. Incompatible changes (removing a
field, changing semantics, changing the ID shape) must bump the format version and
include migration notes; compatible clarifications and additional examples only
update documentation and the release version's minor/patch numbers.

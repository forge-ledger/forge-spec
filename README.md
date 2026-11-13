# Forge Ledger Format · v1

**A local format specification for compiling conversations, documents, and decisions
into a typed, provenance-backed, maintainable asset library.**

This repository defines the format only. It contains no reference implementation,
hosted service, or evaluation set.

- **Local-first**: the format is a plain directory; no database service, account, or
  network is required.
- **Provenance is a hard constraint**: assertions without provenance must not enter
  the asset layer.
- **Byte-for-byte reproducible**: the same input must produce the same bytes; no
  timestamps or randomness in output.
- **Migratable**: one format version, with an explicit migration path for old assets.

## Language

- The **English** text in this repository is normative.
- A Chinese reference translation lives in [`zh/`](zh/). It is informative and may
  lag; if the two disagree, the English version prevails.
- v1 example assets and required section headings remain in Chinese because they are
  part of the v1 wire format (`schema/taxonomy.yaml` and `schema/asset-types/`).
  Translating them requires a format-version change.
- The zero-dependency validator and DCO check emit Chinese diagnostic messages. Their
  error codes and exit codes are stable and language-neutral.

## 30-second overview

The ledger has three layers:

| Layer | Writable? | Contents |
|---|---|---|
| `sources/` | read-only, append-only | raw sources (conversation exports, documents, tickets); immutable |
| `assets/` | writable | compiled decisions / states / events / rules, each with provenance |
| `index/` | rebuildable | an index derived from sources and assets; delete it and recompute |

An asset is a Markdown file: YAML front-matter holds structure, the body holds
human-readable content.

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

The body headings in the example are literal v1 section names. See
[`examples/`](examples/) for the complete fixtures.

## Repository contents

```
README.md              this file
.gitattributes         LF-only checkout rule
LICENSE                layered license map
LICENSES/              full license texts (CC0 / CC-BY / AGPL)
zh/                    Chinese reference translation (informative)
specification.md       normative text: layers, types, fields, validation rules
ids.md                 ID shape and value derivation
provenance.md          provenance span syntax and rules
schema.json            JSON Schema for v1 front-matter
schema/taxonomy.yaml   machine-readable taxonomy
schema/asset-types/    templates and boundaries for the four asset types
examples/              synthetic example ledger (validated by validate.mjs)
validate.mjs           zero-dependency validator
dco.mjs                zero-dependency DCO check (used by CI)
decisions/             public format decision records
GLOSSARY.md            English ↔ Chinese terminology table
CHANGELOG.md           format changelog
GOVERNANCE.md          change process and version policy
CONTRIBUTING.md        how to contribute
CODE_OF_CONDUCT.md     code of conduct
SECURITY.md            how to report security issues privately
TRADEMARKS.md          trademark and branding policy
.github/               issue / PR templates and CI
```

## Quick start

Requires Node.js 24 or later (built-in modules only, no dependencies).

```bash
node validate.mjs             # validate schema, taxonomy, and examples
node validate.mjs --self-test # explicitly demand the mutation self-test (also runs by default)
```

`validate.mjs` does four things:

1. validates each example's front-matter against `schema.json`;
2. checks that the machine-readable part of `schema/taxonomy.yaml` has not drifted;
3. checks ID prefixes, required fields, required sections, dates, and whether spans
   actually resolve; it also checks that the major version in `VERSION` matches the
   format version;
4. runs a set of mutations and proves that every check turns red — a check that can
   only pass is not a check (including version mismatch, malformed `VERSION`, and an
   empty `VERSION`).

## Four non-negotiable rules

1. **Assertions without provenance must not enter `assets/`.**
   Provenance is a hard constraint, not optional metadata. An unverifiable scheme
   must report "unverifiable", never "pass".
2. **External evidence lands in `sources/` first, then is referenced with `src://`.**
   URLs, tickets, and production logs cannot be used directly as spans: provenance
   rots with the outside world, and rotten provenance is worse than none — it looks
   like evidence.
3. **Conflicts never overwrite automatically.**
   A judge may produce candidates, but rewriting an existing asset must be triggered
   by a human and must leave a date and a reason.
4. **Output is byte-for-byte deterministic.**
   No timestamps, randomness, local time zones, or newline differences in artifacts.

## What is not in this repository

This repository deliberately does **not** contain:

- the source code of a reference implementation;
- evaluation sets, thresholds, or regression cases used to score an implementation;
- any real conversation, customer data, or "anonymized sample";
- a hosted service, telemetry, or account system;
- future roadmap dates.

If you need an implementation, write one against this specification; the format is
not tied to any single implementation.

## Versioning and compatibility

- **Format version**: the integer in `schema/taxonomy.yaml`, currently `1`. Every
  asset's `schema_version` must equal it.
- **Release version**: the `x.y.z` in `VERSION`, currently `1.0.0`, corresponding to
  the tag `spec-vX.Y.Z`. It only marks a release batch.
- **Mapping**: the major version of the release must equal the format version
  (`1.0.0` ↔ format v1). `validate.mjs` checks this and reports `VERSION_MISMATCH`
  when it does not hold.
- Incompatible changes must bump the format version and provide migration notes; the
  release version's major number follows.
- Compatible clarifications and additional examples only update docs and the release
  version's minor/patch numbers.

## License

- Specification, taxonomy, and examples: **CC0-1.0** (`LICENSES/CC0-1.0.txt`).
- Documentation: **CC-BY-4.0** (`LICENSES/CC-BY-4.0.txt`).
- Reference implementation (not in this repository): **AGPL-3.0-only**
  (`LICENSES/AGPL-3.0-only.txt`).

The specification uses the most permissive license because the first requirement of
a standard is zero friction. The reference implementation uses AGPL to prevent a
closed-source hosted fork. They are different layers; do not conflate them.

## Security

Do not post real conversations or customer data in issues. Report security issues
through `/security/advisories/new`; see `SECURITY.md` for the response commitment.

## Contributing

Format changes require an RFC; examples must be synthetic; submissions must pass
`node validate.mjs`. See `CONTRIBUTING.md` and `GOVERNANCE.md`.

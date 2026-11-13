# 0003 · Provenance is a span, not free text

## Problem

What makes an assertion "have provenance"? If provenance is just free text ("from
some meeting"), it cannot be parsed mechanically, and it cannot be checked when the
source changes.

## Options considered

1. **Free-text citations**: human-friendly, but unverifiable; after rotting they
   still look like evidence.
2. **URLs as provenance**: rot with the outside world; cannot point to a stable
   location inside the repository.
3. **Structured spans**: `scheme://target#anchor`, where the anchor can be a
   heading, a text fragment, a key path, or a line range.

## Decision

Use structured spans. Two hard rules:

1. **Assertions without provenance must not enter `assets/`.**
2. **External evidence lands in `sources/` first, then is referenced with `src://`.**

A `#t:` fragment is at least 8 characters; a shorter fragment matches any document,
and that is not evidence. "Unverifiable" and "pass" must be two different outputs.

## Consequences

- **Good**: provenance can be checked mechanically; changes to the source are
  detected instead of silently rotting.
- **Cost**: writing an asset requires finding quotable source text; anchors need
  maintenance.
- **Residual risk**: `#t:` is sensitive to formatting; `#k:` requires a connector
  that provides structured resolution.

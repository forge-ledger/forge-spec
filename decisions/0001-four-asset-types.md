# 0001 · Only four asset types, divided by write rule

## Problem

Should asset types be divided by business domain (decision, state, event, rule,
todo, monitor, playbook, …), or by **write rule**?

## Options considered

1. **Divide by business domain**: the number of types grows with product features;
   the question "these two types actually have the same write rule" keeps
   recurring.
2. **Divide by write rule**: keep only types whose write rules differ; merge things
   with the same write rule.
3. **Keep free text only**: drop types and rely on full-text search. The cost is
   that required fields and conflicts cannot be checked mechanically.

## Decision

**Divide by write rule; v1 defines exactly four**: `decision`, `state`, `event`,
`rule`.

Criterion: a type is a shared key for directory partitioning, index keys, and
retrieval routing. Every additional type adds a branch to every downstream
consumer.

## Consequences

- **Good**: each type maps to one clear write rule; required fields and required
  sections can be checked mechanically.
- **Cost**: some business concepts have no dedicated type and must be assigned to
  the closest write rule.
- **Residual risk**: when a genuinely different write rule appears, adding a type is
  a major-version migration.

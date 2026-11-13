# Governance

## Goal

Make changes to the specification **predictable, reviewable, and migratable**. A
standard's value comes from stability; stability requires that the change process
itself is public.

## Roles

- **Maintainers**: merge changes, publish releases, handle security reports.
  Currently the repository owner.
- **Contributors**: submit specification text, examples, validation rules, or
  compatibility feedback.
- **Implementers**: people who build readers, writers, or migration tools outside
  this repository.

## Change categories

| Category | Examples | Requirement |
|---|---|---|
| Clarification | typo fixes, additional examples, explaining an existing rule | normal PR; approval by at least one maintainer |
| Compatible addition | a new optional field, a new example | RFC; explain how older implementations ignore it |
| Incompatible change | removing a field, changing semantics, changing the ID shape | RFC + format major-version bump + migration notes |

## RFC process

1. In an issue, state the specific problem, the options considered, the choice, and
   its consequences.
2. Provide at least one **synthetic** example showing the before/after difference.
3. A maintainer decides; the decision is recorded in `decisions/`.
4. Before merging, `node validate.mjs` must be green.

## Versions

- The **format version** is a single integer in `schema/taxonomy.yaml`.
- Every asset's `schema_version` must equal it.
- The **release version** is the `x.y.z` in `VERSION`; its major number must equal
  the format version.
- Incompatible changes must bump the format major version and include migration
  notes in `CHANGELOG.md`.

## Decision records

Public format decisions live in `decisions/`. Each record answers four questions:

1. What was the tension at the time?
2. Which options were considered?
3. What was chosen, and by what criterion?
4. What are the costs and residual risks?

## No promised dates

This repository does not promise roadmap dates. A format is a long-lived artifact,
not a quarterly product; dates written into the README become liabilities.

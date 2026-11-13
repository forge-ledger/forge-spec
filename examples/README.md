# Example ledger

These files are **synthetic**. They do not come from any real conversation or
customer data.

```
sources/conversation.md                        synthetic source
assets/dec/dec_01M6...md                       decision example
assets/state/state_01M6...md                   state example
assets/event/event_01M6...md                   event example
assets/rule/rule_01M6...md                     rule example
```

Every example's `sources` points to a sentence or heading that actually exists in
`sources/conversation.md`, so `node validate.mjs` really resolves provenance instead
of only checking string shape.

## Language note

The example assets are intentionally in Chinese. v1 requires the literal section
titles listed in `schema/taxonomy.yaml` (`问题`, `考虑过的选项`, `选定`, `后果`,
`当前状态`, `规则`, `强制`), and those titles are part of the v1 wire format.
Translating the examples without changing the taxonomy would make them invalid.
A language-neutral section scheme is a candidate for a future format version.

## Reading the examples

- The four sections of a `decision` are not a formatting requirement; they are a
  device that keeps a decision record from degrading into a bare conclusion.
- `state` requires `subject` and `last_confirmed`; a state without a subject does
  not participate in conflict detection.
- `event` is append-only; `status: recorded` in the example means it has happened.
- `rule` must point to a specific incident through `origin_incident`.

## Adding an example

1. Write the text it cites in `sources/` (it must be synthetic).
2. Create a file under `assets/<type>/`; its front-matter must pass `schema.json`.
3. Run `node validate.mjs`; it turns red if provenance cannot be resolved.

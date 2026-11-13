# Contributing

Thank you for considering a contribution. This specification aims to be stable,
verifiable, and migratable; contributions are measured by the same standard.

## What you can contribute

- clarifications and typo fixes to the specification text;
- new **synthetic** examples (they must pass `node validate.mjs`);
- additional validation rules and counterexamples;
- compatibility feedback: which rule a real implementation cannot read.

## What not to contribute

- **real conversations, customer data, or any "anonymized sample".** One mistaken
  commit is a trust collapse.
- evaluation sets, scoring thresholds, or cases used to grade an implementation.
- roadmap dates or "we will do this next quarter" promises.
- private extensions that only serve one implementation; the format must remain
  implementation-neutral.

## Before submitting

```bash
node validate.mjs
```

Requirements:

- all examples pass validation;
- new examples must cite synthetic sentences that actually exist in
  `examples/sources/`;
- when changing specification text, check that `schema/taxonomy.yaml`,
  `schema.json`, and the examples still agree;
- sign off your commits under the DCO: `git commit -s`. CI's `dco` job checks every
  commit; a PR without `Signed-off-by` will not turn green.
- if you edit files through the GitHub web UI, add this line manually at the end of
  the commit message:
  `Signed-off-by: Your Name <your-email>`.

## License

- specification text, taxonomy, and examples are contributed under **CC0-1.0**;
- documentation is contributed under **CC-BY-4.0**.

By submitting, you agree to publish your contribution under the corresponding
license.

## Pull request checklist

- [ ] the change belongs to the current version, or an RFC has been opened per
      `GOVERNANCE.md`;
- [ ] examples are synthetic and contain no real data;
- [ ] `node validate.mjs` passes;
- [ ] if fields or semantics changed, `CHANGELOG.md` has a corresponding note;
- [ ] commits carry `Signed-off-by` (`git commit -s`).

## Code of conduct

Participation in this project means agreeing to follow `CODE_OF_CONDUCT.md`.

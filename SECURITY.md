# Security policy

## Reporting a security issue

Please **do not** report security issues in a public issue.

Use GitHub's private reporting channel:
`Security` → `Advisories` → `Report a vulnerability`
(or `/security/advisories/new` on the repository page).

You may also email `security@forge-ledger.com`. Do not put sensitive details in a
public issue.

Please include:

- the affected specification version;
- the smallest synthetic example needed to reproduce the issue;
- what you expected and what actually happened;
- whether you have already observed it in an implementation.

**Do not attach real conversations or customer data to a report.** If you need an
example, use synthetic data.

## Response commitment

- acknowledge receipt within **48 hours**;
- provide an initial assessment within 7 days (whether it is a security issue and
  its impact);
- coordinate a disclosure date with the reporter once a fix or mitigation is
  determined.

## Scope

This repository is a specification, not an executable service. The following are in
scope:

- the specification permits a design that causes data loss, provenance forgery, or
  silent overwrites;
- the validator (`validate.mjs`) treats bad input as passing;
- examples or documentation lead readers to write real data into the repository.

The following are usually out of scope:

- vulnerabilities in a third-party implementation (report them to that
  implementation);
- GitHub platform issues unrelated to this specification.

## Supported versions

**v1** is currently supported. Older versions receive migration guidance only.

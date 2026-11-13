# Public format decisions

This directory records **public format decisions**, not internal product decisions.
Each record answers:

1. What was the tension at the time?
2. Which options were considered?
3. What was chosen, and by what criterion?
4. What are the costs and residual risks?

Numbers only increase. An incompatible change must add a new record and bump the
format major version.

| Number | Decision |
|---|---|
| 0001 | Only four asset types, divided by write rule |
| 0002 | Prefix + 26 base32 characters; content-addressed when recomputable |
| 0003 | Provenance is a span, not free text |
| 0004 | Freshness is attached only to state |
| 0005 | Format version and release version are two layers; majors must align |

# 0004 · Freshness is attached only to state

## Problem

Which assets can expire? What happens if every type gets an expiry date?

## Options considered

1. **Every type carries freshness**: uniform rule, but creates checks for things
   that never expire.
2. **Only state carries freshness**: it is bound to reality, and expiry is a real
   failure mode.
3. **No expiry check**: the library rots slowly with no signal.

## Decision

Only `state` carries freshness, with a default window of 30 days.

- A `decision` is immutable once `accepted`; "expired" has no meaning for it.
- An `event` is something that happened; it cannot expire.
- A `rule` is traced by `origin_incident`, not by time.

The freshness check is **not part of the commit gate**: its verdict depends on
"today", which would make an untouched asset turn red one morning. It belongs to a
maintenance task.

## Consequences

- **Good**: the expiry signal has a clear owner and is not drowned out by noise from
  other types.
- **Cost**: `state` must carry two extra fields: `last_confirmed` and `subject`.
- **Residual risk**: auto-confirm makes the library look fresh forever; the
  specification therefore explicitly forbids it.

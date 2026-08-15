---
decided: 2026-08-03
verified: 2026-08-15
---

# Illegal-tap feedback removed — Pedro's call

Device test D1 found that tapping an unplayable card did **nothing at all** — no
shake, no haptic, no text — while legal cards in the same hand played fine. That
combination is impossible to explain from reading the code (legal cards playing
means every guard in `onCardTap` passed, so a dimmed card must come back non-null
from `whyUnplayable`). **The cause was never identified.**

Pedro prefers the silence, so it's now explicit rather than accidental: the tap
returns at `whyUnplayable` and nothing fires. `triggerShake`, `unplayableText`, the
`shakeId`/`shakeAnim`/`shakeResetRef` state, the `Animated` import, and the
`cardRejected` style were all deleted — they were dead once nothing called them.
See [[Wild +4 Restriction]] for the message this superseded.

**Accessibility is unaffected.** Each card's `accessibilityLabel` still carries its
reason via `unplayableHint()`, because a screen-reader user has no dimming to read.
That's why `whyUnplayable()` and its tests stay.

## If anyone restores the visible feedback

Find what was swallowing it first. An unexplained failure that gets built on top of
will resurface. A plausible suspect never ruled out: `hapticError()` throwing, which
would also silently kill the deck-tap message (test D6, still untested as of
2026-08-15).

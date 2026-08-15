---
decided: 2026-08-03
verified: 2026-08-15
---

# Wild +4 restriction — kept

Reported as "wild cards should always be available" from a screenshot of a dimmed
Wild +4. **Not a bug, and the rule stays** (Pedro confirmed): plain Wild is
unrestricted and never dims; Wild +4 is illegal while you hold a card matching the
active colour — the official rule, already documented in `LASTCARD_SPEC.md`. Without
it, +4 is a free every-turn attack.

## What actually needed fixing

The generic error message was the real problem, not the rule. Tapping the dimmed +4
while holding a Green 5 said *"Can't play that — match Green or a 5"* — naming the
card in your hand as the reason you can't play a *different* card. `whyUnplayable()`
(`game/lastCard.js`) was changed to return a reason code instead of one flat string.

**Superseded the same day** by [[Illegal-Tap Feedback Removed]] — the on-screen
message this fix introduced no longer exists; the reason codes now feed the card
dimming and the accessibility labels only.

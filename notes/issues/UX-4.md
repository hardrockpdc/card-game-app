---
id: UX-4
type: ux
area: animation
status: partial
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "GameScreen.js:163-170 still gates on a blanket 50ms setTimeout with no fade (Card.js:236-263 confirms no opacity treatment when animateDeal is false); ConquianGameScreen.js:432, RummyGameScreen.js:538, GoFishGameScreen.js:227, PokerGameScreen.js:743 now set hasMountedRef synchronously in init() with no timer window at all, as a side effect of the UX-3 fix, not a deliberate fix of this ticket"
---

## Problem

## UX-4. No visual "dealing" state during the 50ms hasMountedRef delay

**Effort:** Skip (intentional, minor)

### What's happening

For the 50ms before `hasMountedRef.current = true`, cards are at their final position with no animation. If the user hits "Deal" and renders happen on a slow phone, there's a brief window where cards just appear with no transition.

### Why this matters

Almost never visible. Listed for completeness.

### The fix

Probably none needed. If you want to be precise, set initial opacity to 0 and only show cards once `hasMountedRef.current` is true. But it's a tradeoff — adds complexity for a 50ms invisible flash that almost nobody will see.

## Verified 2026-08-15

This ticket was filed as "Effort: Skip" — a documented, deliberate non-issue, never
intended to be worked. The question worth asking isn't "was this fixed" but "does the
described gap still exist," and the honest answer is: it depends which screen.

The ticket describes one mechanism as if it's universal app-wide. That's no longer true —
the codebase has split since it was filed:

- **Blackjack (`GameScreen.js`)** — the gap is present exactly as described, unchanged. A
  literal 50ms `setTimeout` (lines 163-170) gates `hasMountedRef`, and `animateDeal` is read
  directly off that ref at render (line 744). `components/Card.js:236-263` confirms there's
  genuinely no fade/opacity treatment during that window when `animateDeal` is false — cards
  render at full opacity with no transition. Nobody touched this file for this ticket,
  consistent with "Effort: Skip."
- **Conquián, Rummy, Go Fish, Poker** — the described gap no longer exists, but not because
  anyone fixed *this* ticket. Each of these was touched for the adjacent ticket [[UX-3]]
  (deal animation replaying after nav), and that fix's approach A ("set `hasMountedRef.current
  = true` synchronously... before the first render" for the restore path) incidentally
  rewrote the fresh-deal path too — `hasMountedRef.current = true` is now set synchronously
  inside `init()` (Conquián:432, Rummy:538, GoFish:227, Poker:743), not gated by any timer.
  No window where `animateDeal` is false exists on a fresh deal in these four games anymore.
  A side effect of unrelated work, not a deliberate close of UX-4.

None of the clean status words fit "still true in one place, no longer true in four others,
nobody ever intended to fix it anywhere" — not `fixed` (nobody added the suggested opacity
treatment, and Blackjack still has the identical gap), not `moot` (the underlying question is
still concretely answerable, and still "yes," for Blackjack), not `open` in the ticket's own
implied-universal sense (stale for 4 of 5 affected screens). `partial` captures this most
honestly. Severity stays `low` — matches the original filer's own assessment ("almost never
visible... listed for completeness"), nothing here changes that risk profile.

**No fix warranted**, consistent with the original "Skip" call. If Blackjack's gap is ever
worth closing to match the other four screens (which would incidentally resolve this
ticket everywhere), the fix isn't the opacity-0 treatment the ticket speculates about — it's
simpler: replace Blackjack's blanket `setTimeout(..., 50)` mount effect with the same
synchronous-assignment pattern the other four screens now use. That's a "make Blackjack
consistent" cleanup, not a UX-4-specific fix, and should be scoped separately if ever wanted.

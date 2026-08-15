---
id: UX-4
type: ux
area: animation
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "GameScreen.js's blanket 50ms setTimeout mount effect removed; hasMountedRef is now set synchronously in the fresh-game branch of checkResume() and via a 0ms setTimeout after applying restored state on resume, matching the pattern ConquianGameScreen.js:432/427, RummyGameScreen.js:538, GoFishGameScreen.js:227, PokerGameScreen.js:743 already use"
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

## Fixed 2026-08-15

Applied the cleanup this note sketched: `GameScreen.js`'s blanket `setTimeout(..., 50)` mount
effect is gone. `hasMountedRef` is now set synchronously in `checkResume()`'s fresh-game
branch (no resume, or no save found), and via a `0ms` `setTimeout` after applying restored
state on the resume path — same shape as Conquián/Rummy/Go Fish/Poker's `init()`. This also
closes a latent race the blanket timer had: if `loadGame()` ever took longer than 50ms,
`hasMountedRef` could flip true before the restored hand was applied, replaying the deal
animation on a resumed game. Blackjack is single-player only, so this is a pure client-side
timing fix with no multiplayer/online surface.

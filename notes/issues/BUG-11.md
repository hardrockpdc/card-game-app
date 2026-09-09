---
id: BUG-11
type: bug
area: poker
status: open
severity: high
opened: 2026-09-08
verified: 2026-09-08
evidence: "PokerGameScreen.js:175 deals hands[id] = [deck[di++], deck[di++]] — hardcoded two cards, no reference to variant or holeCardCount. Community cards dealt unconditionally at :275-284. Device-confirmed on emulator-5554 2026-09-08: Omaha showed 2 hole cards (needs 4); Five Card Draw showed 2 hole cards plus a five-card board (needs 5 and no board). game/poker.js exports dealPokerVariantHands (:579) which honours config.holeCardCount, but grep shows its only importer is __tests__/poker.variants.test.js — no screen imports it"
---

## Problem

**BUG-11. Three of the four Poker variants do not deal or play by their own rules. Only Texas Hold'em is real.**

`PokerGameScreen` deals a fixed two cards per player and always runs the Hold'em
board:

```js
hands[String(p.id)] = [deck[di++], deck[di++]];   // :175
```

Nothing in that function reads `variant` or `holeCardCount`. The community cards at
`:275-284` are dealt unconditionally, on the `preflop → flop → turn → river` machine.

| Variant | Should deal | Actually deals | Board | Should have |
|---|---|---|---|---|
| Texas Hold'em | 2 | 2 | 5 | 5 |
| Omaha | 4 | **2** | 5 | 5 |
| Five Card Draw | 5 | **2** | 5 | **none** |
| Seven Card Stud | 7 | **2** | 5 | **none** |

Selecting Omaha, Five Card Draw or Seven Card Stud gives you Texas Hold'em with a
different name in the header.

## Why the tests did not catch it

There are two parallel poker implementations, and the tested one does not ship.

- `game/poker.js` has `POKER_VARIANTS` with correct `holeCardCount` /
  `usesCommunityCards` / `usesDrawPhase` / `communityRevealCounts` per variant, a
  correct `dealPokerVariantHands()` (`:579`) that loops `config.holeCardCount`, and
  `getBestFiveCardHand()`. `__tests__/poker.variants.test.js` covers it and passes.
- `PokerGameScreen.js` (1594 lines) carries **its own** `evaluate5` (`:76`) and
  `bestHand` (`:139`), its own dealing, and its own phase machine — and until
  [[BUG-14]] imported nothing from `game/poker.js` at all.

So the variant logic is written, correct and green, and the app never calls it. A
passing suite was never going to catch this. [[BUG-13]] is the related lesson: the
suite was not even running.

## This is a feature build, not a one-line fix

Correcting `:175` to respect `holeCardCount` would fix the card counts and nothing
else — and would arguably be worse than the current state, because each variant would
then *look* right while still being scored and bet by Hold'em rules. Concretely:

- **Omaha** needs an evaluator using **exactly two** hole cards and **exactly three**
  board cards. The screen's `bestHand` takes the best five of all nine, which is not
  Omaha and silently misreads hands.
- **Five Card Draw** needs no board at all, plus a discard/replace phase with its own
  betting round. There is no draw phase anywhere in the screen.
- **Seven Card Stud** needs no board, seven cards per player with three down and four
  up, and five betting streets rather than four.

Each of those changes the phase machine, the betting loop, the network messages and
the table layout. For a family card game (CLAUDE.md §4), shipping poker that quietly
scores hands wrong is worse than shipping fewer variants.

## Options, for a decision

1. **Hide the three until they work.** Smallest honest change: the picker offers only
   Texas Hold'em, or marks the others "Coming soon". App stops advertising games it
   does not have. Reversible, forecloses nothing.
2. **Implement Omaha only.** The cheapest real variant — deal four, gate the
   evaluator to 2-from-hand + 3-from-board. No new phase. Leaves Draw and Stud hidden.
3. **Implement all three.** Substantial. Realistically wants the screen rebuilt on
   `game/poker.js` instead of its private duplicate, which is a large refactor of a
   1594-line file and should not be attempted as a "fix".

Recommendation: **1 now, 2 next.** Option 3 only as deliberate, planned work — and
if it happens, the first step is deleting the duplicate evaluator so there is one
poker implementation instead of two.

Not started pending that call. The cosmetic problems around it ([[BUG-14]],
[[BUG-15]], [[BUG-16]]) are fixed and independent of whichever option is chosen.

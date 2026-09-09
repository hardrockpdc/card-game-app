---
id: BUG-11
type: bug
area: poker
status: fixed
severity: high
opened: 2026-09-08
verified: 2026-09-08
evidence: "FIXED 2026-09-08. Was: PokerGameScreen.js:175 deals hands[id] = [deck[di++], deck[di++]] — hardcoded two cards, no reference to variant or holeCardCount. Community cards dealt unconditionally at :275-284. Device-confirmed on emulator-5554 2026-09-08: Omaha showed 2 hole cards (needs 4); Five Card Draw showed 2 hole cards plus a five-card board (needs 5 and no board). game/poker.js exports dealPokerVariantHands (:579) which honours config.holeCardCount, but grep shows its only importer is __tests__/poker.variants.test.js — no screen imports it. Now: initDeal deals config.holeCardCount (stud a street at a time via studDealCounts), the phase machine indexes communityRevealCounts, scoring goes through evaluatePokerVariantHand, and the screen's duplicate evaluator is deleted. Device-verified on emulator-5554: Omaha deals 4 with a board, Five Card Draw deals 5 with no board and a working discard round (swapped 7♥ for Q♣, showdown read Two Pair vs High Card and paid 40), Seven Card Stud deals 3 then 1 per street with the opponent showing 2 down + up cards. 50 suites / 595 tests"
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


## Fixed 2026-09-08

Done in four commits rather than one, each device-verified before the next.

**Foundation.** `initDeal` deals `config.holeCardCount`; the phase machine is
indexed off `communityRevealCounts` instead of branching on street names;
showdown and the AI score through `evaluatePokerVariantHand`. The screen's
private `evaluate5`/`bestHand`/`cmpScore` are gone, so there is one poker
implementation instead of two. The board row only renders for variants that
have one, and the hand row scales down past four cards — seven full-size cards
need about 538dp of row on a ~411dp screen and were being clipped.

`poker.deckInterop.test.js` pins the thing that makes all of this work: the
screen deals `game/deck.js` cards (`{rank:"A", suit:"♠"}`) while `game/poker.js`
reads them through `getCardValue`/`getCardSuit`. That tolerance is load-bearing
now and would fail silently rather than throw.

**Omaha** needed nothing beyond the foundation — `evaluatePokerVariantHand`
already enforced exactly two hole cards and three board cards, and a test
covers the case where four suited hole cards must *not* make a flush.

**Five Card Draw** gained the round it is named after: bet, draw, bet,
showdown. `drawReplacementCards` and `chooseFiveCardDrawDiscards` already
existed in the module. During the draw the betting row becomes a single
Stand Pat / Swap N button and cards become tappable.

**Seven Card Stud** became an actual stud game rather than seven cards dealt at
once. `studDealCounts: [3,1,1,1,1]` deals three on third street then one per
street across five betting rounds, and `studDownCardIndexes: [0,1,6]` keeps
three cards hidden so four are up. Opponents' up cards are published through
`redactStudHand`, which lives in `game/poker.js` precisely so it can be tested —
`toPublic` has always stripped `hands`, and it must keep doing so. Down cards
are sent as `null` rather than omitted, so the table can draw a face-down card
in the right position without being told what it is. `poker.stud.test.js`
asserts that a redacted hand contains no trace of a down card, not even its
rank.

## Not done

Stud's betting is five equal rounds with blinds rather than an ante plus a
bring-in decided by the lowest up card, and action order does not move to the
best showing hand. Both are real stud rules and neither is implemented; the
hand deals, scores and pays correctly without them. Worth a separate note if it
ever matters for this audience.

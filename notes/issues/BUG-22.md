---
id: BUG-22
type: feature
area: blackjack
status: fixed
severity: low
opened: 2026-09-08
verified: 2026-09-08
evidence: "GameScreen.js offers only Hit, Stand and Split. Split is implemented (canSplit at :578 requires a two-card hand of matching rank plus enough coins; splitHand/splitResult state, BJ_SPLIT_PURPLE styling, handSplit persisted in the save). No doubleDown/canDouble identifier and no Double button exists anywhere in the file. Confirmed on emulator-5554 2026-09-08 with 7♦ 8♥ against a dealer 3 — a textbook double-down spot — where only Hit and Stand were offered. Implemented 2026-09-08: canDouble at GameScreen.js gates on an unsplit two-card hand with coins for a second bet; handleDoubleDown matches the bet, deals exactly one card and ends the turn. Device-verified twice on emulator-5554 — a winning double on 6♦2♦+10♥ paid 40 on a 20 stake (1100 to 1130) and a losing double on 8♥4♥+7♥ read -20 with streak 1L"
---

## Problem

**BUG-22. Blackjack has no Double Down.**

The table offers Hit, Stand and Split. Split is properly implemented — it needs a pair
and enough coins to match the bet, has its own state and styling, and survives a save.
Double Down simply is not there: no state, no handler, no button.

It is one of the four standard player options, and the one that most changes how the
game is played — without it, strong two-card totals against a weak dealer card cannot be
pressed, so the basic strategy a player might know does not apply.

Found while testing the win path on 2026-09-08, holding 7♦ 8♥ against a dealer 3.

## Why it was filed as a gap first

Worth being clear that this is a gap rather than something broken. A family card game can
reasonably ship Blackjack without Double Down, and nothing in the UI advertises it — the
help text's "Win = double your bet" describes the payout, not the option. Nothing
misreports; the option is simply absent.

Filed so the decision was explicit rather than accidental. Pedro chose to add it.

## Implemented 2026-09-08

Modelled on Split, which already handled "needs a second bet from the coin balance".

- `canDouble` requires an unsplit opening hand of two cards, no prior double, and enough
  coins for the second bet.
- `handleDoubleDown` subtracts the second bet, deals exactly one card, then either
  settles a bust immediately or runs the dealer — the turn cannot continue either way.
- The state is mirrored in a ref, because `resolveHandPayout` runs from closures where
  the state value can be stale. That is the same reason `currentBetRef` exists.
- The flag is persisted in the save and restored, so resuming a doubled hand still pays
  the doubled amount.

**Doubling after a split is deliberately not offered.** It is legal at a real table, but
it would put a third stake in play and the payout maths here tracks one stake per hand.
Half-supporting it would be worse than leaving it out.

### A bug found by testing it

The first device run paid the right balance but displayed the wrong number: a winning
double showed "+30 coins" when the actual profit was +20. `resolveHandPayout` computed
`totalBet` as `hadSplit ? bet * 2 : bet` — it knew about a split's second stake but not
a double's.

That was not only a label problem. `coinsDeltaNet` also drives the win/loss streak, so a
doubled **push** would have been counted as a win. Now:

```js
const totalBet = bet + (hadSplit ? bet : 0) + (doubledDownRef.current ? bet : 0);
```

Re-verified on device: a losing double reads "-20 coins" and sets streak 1L.

## Still not implemented

Insurance and surrender. Recommended against rather than skipped: insurance is a side bet
with roughly a 7% house edge — a rule that would have to be explained to a family player
as "the option you should never take" — and surrender is rare in casual play and mostly
adds a confusing button. Both remain easy to add if wanted.

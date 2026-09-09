---
id: BUG-22
type: gap
area: blackjack
status: open
severity: low
opened: 2026-09-08
verified: 2026-09-08
evidence: "GameScreen.js offers only Hit, Stand and Split. Split is implemented (canSplit at :578 requires a two-card hand of matching rank plus enough coins; splitHand/splitResult state, BJ_SPLIT_PURPLE styling, handSplit persisted in the save). No doubleDown/canDouble identifier and no Double button exists anywhere in the file. Confirmed on emulator-5554 2026-09-08 with 7♦ 8♥ against a dealer 3 — a textbook double-down spot — where only Hit and Stand were offered"
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

## Not obviously a defect

Worth being clear that this is a gap rather than something broken. A family card game can
reasonably ship Blackjack without Double Down, and nothing in the UI advertises it — the
help text's "Win = double your bet" describes the payout, not the option. Nothing
misreports; the option is simply absent.

Filed so the decision is explicit rather than accidental.

## If it is picked up

The Split implementation is the model to follow — `canSplit` at `GameScreen.js:578`
already handles the "needs a second bet from the coin balance" case, which Double Down
needs too. A double is simpler than a split: match the bet, deal exactly one card, then
force a stand.

Worth deciding alongside: Blackjack currently has no insurance or surrender either, and
those are much more reasonable to leave out.

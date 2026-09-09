---
id: BUG-15
type: bug
area: ui
status: fixed
severity: medium
opened: 2026-09-08
verified: 2026-09-08
evidence: "SinglePlayerSetupScreen.js:34 (rummy) and :55 (poker) both hardcoded tag: \"3 variants\". game/rummy.js defines four (ginRummy, rummy500, indianRummy, canasta) and game/poker.js defines four (texasHoldem, omaha, fiveCardDraw, sevenCardStud). Both corrected to \"4 variants\" and device-verified on emulator-5554 2026-09-08 — grid now reads 4 VARIANTS on both tiles"
---

## Problem

**BUG-15. Both "3 variants" tags on the game grid were wrong — Rummy and Poker each have four.**

`game/rummy.js` defines Gin Rummy, Rummy 500, Indian Rummy and Canasta. `game/poker.js`
defines Texas Hold'em, Omaha, Five Card Draw and Seven Card Stud. Both tiles claimed
three.

The tags had been stale for some time without anyone noticing, because they were never
rendered. The comment at `SinglePlayerSetupScreen.js:327` records that: *"The tag was in
the data and the style existed, but neither was ever rendered."* Making them visible
surfaced the stale values — that same comment also said "Poker 3 variants" and has been
corrected.

Solitaire's "5 modes" was checked and is correct.

## Verified/Fixed 2026-09-08

Both tags now read "4 variants". Device-verified on the Single Player grid.

Counts are still hand-written rather than derived from `RUMMY_VARIANTS`/`POKER_VARIANTS`,
so they can drift again if a variant is added. Deriving them would be a small, sensible
follow-up; not done here to keep the change to the stated bug.

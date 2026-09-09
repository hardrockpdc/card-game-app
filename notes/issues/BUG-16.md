---
id: BUG-16
type: bug
area: ui
status: fixed
severity: low
opened: 2026-09-08
verified: 2026-09-08
evidence: "POKER_VARIANT_OPTIONS in components/PokerVariantWheel.js:8-13 had only value+label, while VariantOptionGrid.js:65-73 renders option.description when present. Rummy (game/rummy.js) and Solitaire (game/solitaire.js:31-53) both supply descriptions, so only the Poker picker rendered bare tiles with empty space. Descriptions added; device-verified on emulator-5554 2026-09-08"
---

## Problem

**BUG-16. Poker variant tiles rendered with no description, unlike every other picker.**

`VariantOptionGrid` renders `option.description` when it exists. Rummy and Solitaire both
provide one per variant, so their tiles read as intended. `POKER_VARIANT_OPTIONS` carried
only `value` and `label`, so the Poker picker showed four tall tiles with a name and a
block of empty space — sized for a description that never arrived.

Cosmetic, but it made the Poker picker look unfinished next to the others.

## Verified/Fixed 2026-09-08

One short description per variant, matching the voice of the Rummy and Solitaire copy.
Device-verified: tiles now render name plus description like the other pickers.

Note the descriptions describe the games as they are meant to play. Three of the four do
not actually play that way yet — that is [[BUG-11]], tracked separately.

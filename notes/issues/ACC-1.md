---
id: ACC-1
type: a11y
area: ui
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "screens/SolitaireGameScreen.js:1811-1812 (accessibilityElementsHidden + importantForAccessibility on the Spider ghost-card wrapper); commit 79bc656 (2026-06-02, message cites \"Resolves DEEP_REVIEW ACC-1\"); WildRoundGameScreen.js half is moot — file deleted commit 473daad (2026-07-01), confirmed to postdate the a11y fix via git merge-base"
---

## Problem

## ACC-1. Wild Round carousel dots + Spider fly-away ghost cards have no a11y labels

**Effort:** 10 minutes
**Risk if ignored:** Minor — screen-reader users hear silence in those regions

### What's happening

Two areas missed in the v2 accessibility sweep:

1. **Wild Round carousel dots** — they're pagination indicators (the spec explicitly says "carousel pagination, not turn indicators") so they don't need a state label, but they could benefit from `accessibilityRole="adjustable"` so screen readers announce them as carousel position.

2. **Spider fly-away ghost cards** — these are decorative-only animated overlays. They should be `accessible={false}` to prevent screen readers from focusing on cards that are flying off the screen.

### Why this matters

Not a real barrier — both are minor polish items. Mentioned here for completeness.

### The fix

In `WildRoundGameScreen.js`, find the carousel dots render and add `accessibilityRole="adjustable"` plus an `accessibilityLabel` like `"Card ${index + 1} of ${cards.length}"`.

In `SolitaireGameScreen.js`, find the fly-away ghost cards render (the `spiderFlyAwayCards.map(...)`) and add `accessibilityElementsHidden={true}` and `importantForAccessibility="no-hide-descendants"` to the wrapper.

## Verified 2026-08-15

Two independent halves, checked separately.

**Half 1 — Wild Round carousel dots: moot.** `screens/WildRoundGameScreen.js` doesn't exist
today — deleted whole-file in commit `473daad` (2026-07-01, "remove Wild Round to keep Card
Night family-friendly"), same removal already established in [[BUG-5]]. `git merge-base
--is-ancestor` confirms the actual historical a11y fix (commit `79bc656`, 2026-06-02)
predates that deletion. Worth recording for accuracy: even before deletion, that fix did
NOT implement what "The fix" section specifies — it wrapped the dot rows in
`accessibilityElementsHidden={true}` (hiding them entirely) rather than adding
`accessibilityRole="adjustable"` with a position label. A different, arguably more
defensible resolution for non-interactive pagination dots, but not what was asked for.
Moot regardless now. If Wild Round is ever revived as a standalone adults-only app from
git history (per `CLAUDE.md`'s stated plan), its dots would still only have the
"hide entirely" treatment.

**Half 2 — Spider fly-away ghost cards: fixed.** Current code,
`screens/SolitaireGameScreen.js:1811-1812`, on the `Animated.View` wrapper inside
`spiderFlyAwayCards.map(...)` (`renderSpider()`, starting line 1802):
```
accessibilityElementsHidden={true}
importantForAccessibility="no-hide-descendants"
```
Functionally equivalent to the requested `accessible={false}` — hides the ghost-card
subtree and its descendants from TalkBack/VoiceOver. `git blame` traces these exact lines
to commit `79bc656`, whose message explicitly cites "Resolves DEEP_REVIEW ACC-1."

Overall verdict `fixed`: the half that still has a live screen to check out is genuinely
resolved; the other half is moot, not open.

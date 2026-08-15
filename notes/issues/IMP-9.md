---
id: IMP-9
type: improvement
area: animation
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "all Klondike/Spider/FreeCell tableau CardSlot call sites in SolitaireGameScreen.js pass animateReveal={true} (lines 1718, 1919, 2212 + foundation/other slots); commit 3ffb20c (2026-06-18, 'fix(solitaire): make uncovered cards flip instead of popping face-up... Fixes IMP-9')"
---

## Problem

## IMP-9. Solitaire face-down reveal flip

**Effort:** 1-2 hours
**Was:** Deferred from animations Level 2

### What's happening

Solitaire (Klondike) has many face-down tableau cards. When a card is uncovered, it should flip face-up (same 3D flip as Blackjack dealer reveal). We deferred this because Solitaire renders through `CardSlot`, not directly through `Card`.

### When to tackle

After IMP-8 or as a focused 1-hour session. Pattern is: pass `animateReveal` through `CardSlot` to `Card`. The flip already works; just needs prop plumbing.

## Verified 2026-08-15

Note: per the restructure plan, IMP-8/IMP-9 are wishes, not defects — `type: improvement`,
verdict vocabulary here means "built / not built," not "open defect."

Built, and has been in the codebase for about two months. `CardSlot` (a local component
inside `screens/SolitaireGameScreen.js:165-235`) accepts `animateReveal` (default `false`)
and passes it straight through to `Card` (line 209). Every Klondike/Spider/FreeCell
tableau `CardSlot` call site passes `animateReveal={true}` (tableau lines 1718/1919/2212,
plus foundation/other slots at 2386/2516/2624/2754). `components/Card.js:76-191`'s
`FlipCard` — the same 3D reveal flip used by Blackjack's dealer hole-card reveal
(`GameScreen.js:742`) — is confirmed still working and shared, not duplicated.

The suggested fix in the original ticket ("just needs prop plumbing, the flip already
works") undersold the actual bug. Commit `3ffb20c` (2026-06-18, "fix(solitaire): make
uncovered cards flip instead of popping face-up... Fixes IMP-9") shows the real problem
was that `CardSlot`'s wrapper element type changed on uncover — a bare `Pressable` versus
a `GestureDetector`-wrapped one, depending on whether the card had a drag gesture — which
remounted `Card` and killed the flip's state transition before it could play. The fix was
to always wrap in a stable `GestureDetector` (a real drag gesture or a disabled fallback
`Gesture.Tap()`) so the component identity never changes on reveal. Prop plumbing alone,
as originally suggested, would not have been sufficient.

Uncovered Klondike (and Spider/FreeCell) tableau cards now animate a 3D flip face-up
rather than popping instantly. `Animations.md` (lines 28, 40) is stale — still describes
Solitaire reveal flips as out-of-scope/pending — worth correcting alongside [[IMP-8]]'s
doc-hygiene note, since both point at the same file.

No fix needed — already built.

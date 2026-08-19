---
id: BUG-9
type: bug
area: ui
status: fixed
severity: low
opened: 2026-08-18
verified: 2026-08-18
evidence: "HomeScreen.js:196-203 coin pill, CardThemeScreen.js:159-163 coin header + :248-257 unlock button label, FramesScreen.js:95-99 coin header, DailyBonusModal.js:70-79 day-amount cell — all split into sibling Text nodes; commit 608cc44"
---

## Problem

**BUG-9. Emoji+label recombined into a single `Text` node, recurring.**

DESIGN.md's Don't list bans this pattern by name — a prior version of the app
rendered emoji-only after an Android re-layout when an emoji and its label
shared one `Text` node. The fix (a row `View` wrapping sibling `Text` nodes,
already shipping as `HomeScreen.js`'s `btnLabel` pattern) had been applied in
some places but not others, and kept recurring in new code.

Surfaced by `.impeccable` whole-app critiques
(`.impeccable/critique/2026-08-17T03-28-04Z__whole-app.md` and
`2026-08-18T01-06-55Z__whole-app.md`) — an Impeccable design-review tool, not
part of this issue tracker. Its findings were never synced here (same gap
`00 Index.md` already flags for the older 2026-08-03 critique archive), so
this ticket exists to close that loop for this pass specifically.

## Verified/Fixed 2026-08-18

Re-checked the critique's claims against current source before fixing —
several named instances (`MultiplayerMenuScreen.js`'s four CTAs, `HomeScreen.js`'s
"How to Play"/"Quit" links, `AchievementsScreen.js`) were already correctly split
in earlier commits and needed no work; the critique's file/line list was stale.

Real remaining instances, fixed via row-`View`-wrapped sibling `Text` nodes,
matching `HomeScreen.js`'s existing `btnLabel` pattern:

- `HomeScreen.js:196-203` — header coin pill (`coinPill` style given
  `flexDirection: "row"`).
- `CardThemeScreen.js:159-163` — shop coin header (reused existing `badgeRow`
  style, alignment preserved).
- `CardThemeScreen.js:149-154`/`248-257` — the locked-deck button label; branched
  the render (plain `Text` for the 3 emoji-free states, a sibling row only for
  the locked state) rather than converting the `buttonLabel()` helper to JSX.
- `FramesScreen.js:95-99` — shop coin header (reused existing `tagRow` style).
- `DailyBonusModal.js:70-79` — day-amount cell; split into two sibling `Text`
  nodes inside the already-column-flex `dayCell`, preserving the icon-above-amount
  stack (no row wrapper needed there).

Commit `608cc44`. Full test suite green (577/577) after the change.

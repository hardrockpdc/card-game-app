---
id: BUG-5
type: bug
area: multiplayer
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-14
evidence: "Wild Round entirely removed from the app — commit 473daad (2026-07-01, \"feat: remove Wild Round to keep Card Night family-friendly\") deleted screens/WildRoundGameScreen.js, game/wildround.js, game/wildroundCards.json, __tests__/wildround.test.js and stripped every reference from App.js/screens/components/game; zero live references remain today; notes/architecture/Project Facts.md (games bullet) documents it; notes/specs/Wild Round.md kept on disk for a possible future standalone app"
---

## Problem

## BUG-5. ~~WildRound has no save/resume~~ — N/A

> **✅ CLOSED (2026-06-17).** Wild Round is multiplayer-only — it was removed from
> the single-player carousel intentionally. Save/resume doesn't apply to a
> multiplayer party game session.

## Verified 2026-08-14

The original closure note only captures the first half of the story. Full timeline:

1. **2026-06-17** (as the archived note describes): Wild Round pulled from the
   single-player carousel only — it remained playable as a multiplayer party game.
2. **2026-07-01** (commit `473daad`): Wild Round was deleted from the app **entirely**,
   not just de-listed. Commit message: its Mature deck (illegal-drug references, sexual
   innuendo, profanity) forced an adults-only content rating on the whole app, clashing
   with the family-friendly positioning. All game logic, card data, the screen, and its
   test file were deleted (~5,200 lines removed net), and every reference was stripped
   from `App.js`, both lobby screens, the multiplayer game picker, How To Play, About,
   `GameHeader.js`, and `tableThemes.js`. Code is intentionally preserved in git history
   (`473daad^`), and `notes/specs/Wild Round.md` (328 lines) was deliberately kept on disk for a
   possible future standalone adults-only app — both confirmed present today.
3. **Today**: zero live references to Wild Round remain anywhere in `App.js`, `screens/`,
   `components/`, or `game/`. `notes/architecture/Project Facts.md`'s games bullet
   accurately documents the removal and reason
   — independently verified against the actual repo state, not taken on faith.

So the original "no save/resume" question is doubly moot: first because the feature went
multiplayer-only, then decisively because the entire game stopped existing. `status: moot`
matches the restructure plan's own instruction for this issue, confirmed by current code
rather than deferred to.

**Minor non-blocking loose end:** `jest.setup.js:3` still has a comment referencing
`game/wildround.js` by path even though the file no longer exists. Not worth its own
tracker entry, just a stale comment.

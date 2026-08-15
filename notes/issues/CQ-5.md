---
id: CQ-5
type: quality
area: theming
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "game/lastCardImages.js exists, 109 require() calls confirmed; screens/LastCardGameScreen.js:68 imports it, 5 real use sites at lines 120-130; commit 73e91d6 (2026-06-18) confirmed as the extraction, diffstat matches (+116/-112)"
---

## Problem

**CQ-5 — DONE 2026-06-18 (`73e91d6`).** Extracted the 109-image LastCard
map to `game/lastCardImages.js`; `LastCardGameScreen.js` imports it. Screen
dropped ~110 lines. The `../assets` paths resolve identically from `game/` and
`screens/`, so requires moved verbatim. No behavior change.

(Checklist-line summary — fuller v2 writeup deleted from the repo.)

## Verified 2026-08-15

Confirmed independently (this same extraction was also examined in detail during the
[[PERF-2]] verification pass; findings agree). `game/lastCardImages.js` exists, holds
exactly 109 `require()` calls in an `LC` map. `screens/LastCardGameScreen.js:68` imports
`LC` from it, with 5 real usages at lines 120-130 (not a dead import). `git show 73e91d6
--stat` confirms the commit's diffstat matches the claim: `game/lastCardImages.js` +116
(new file), `screens/LastCardGameScreen.js` -112ish. No sign of a later revert or
re-inlining — the map still lives only in the extracted file. Claim fully accurate.

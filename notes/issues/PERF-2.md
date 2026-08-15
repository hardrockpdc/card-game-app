---
id: PERF-2
type: perf
area: theming
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-14
evidence: "game/lastCardImages.js (109 require() calls, confirmed), extracted from the screen by commit 73e91d6 (2026-06-18, pure code-move); zero Asset.fromModule/loadAsync/prefetch anywhere in the app; LastCardGameScreen.js:117-130 does per-card key lookups, never renders all 109 at once; same misconception investigated and closed alongside PERF-1 in commit dfa8339 (2026-06-18), documented in archive/PROJECT_NOTES.md:1194-1199"
---

## Problem

## PERF-2. LastCard ships 109 images in a single inline module

**Effort:** 15 minutes (combined with CQ-5)
**Risk if ignored:** Slow LastCard mount, ~7MB images held in memory while LastCard is open

(Carried over unchanged from v2.)

## Verified 2026-08-14

Same underlying misconception as [[PERF-1]], investigated and closed on the same day.

The image count (109) and "single module" description are still accurate — `game/lastCardImages.js` is exactly that module, extracted from `LastCardGameScreen.js` by the CQ-5 refactor (commit `73e91d6`, 2026-06-18) on the same day as the finding below. The extraction only moved the code; it did not change loading behavior.

The module-level `export const LC = { ...109 require() calls... }` does execute at module evaluation time, and because this app has zero code-splitting (`React.lazy`/`Suspense` — zero hits anywhere in `App.js`), that module is evaluated at app startup regardless of whether the player ever opens Last Card. On the surface, the "eager loading" framing looks right.

But as with PERF-1, a static `require("./x.png")` in Metro resolves to a small numeric asset-ID reference at bundle time, not an image load. Real PNG bytes are read/decoded by the native `<Image>` view only when that specific asset ID is actually rendered. `cardImage()` in `screens/LastCardGameScreen.js:117-130` does a single per-card key lookup into `LC` — LastCard never iterates or renders all 109 images at once, mounted or not. Confirmed: no `Asset.fromModule`, `.loadAsync()`, `Image.prefetch()`, or `expo-asset` usage anywhere in the app.

So the real cost of evaluating the 109-entry object at startup is building a small JS object of ~109 asset-ID integers (sub-millisecond) — not "~7MB images held in memory while LastCard is open" as the original risk text claimed. Even "while LastCard is open," only the currently-visible cards' images are ever decoded.

This exact conclusion was documented on 2026-06-18 (commit `dfa8339`, covering PERF-1 and PERF-2 together), in `archive/PROJECT_NOTES.md:1194-1199` — but that finding lives in a different section of the same archive than the still-present "PERF-2 problem" prose (a leftover verbatim carry-over from the older v2 review) being verified here. The doc was self-contradictory: one section says "NOT a real startup issue," another still lists this as an open 15-minute task. That's the kind of staleness this whole restructure exists to catch.

Verdict is `moot`, not `fixed` — the premise was mistaken from the start, on this code and (per the RN asset model) even on the pre-extraction code before CQ-5.

---
id: PERF-1
type: perf
area: theming
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-14
evidence: "game/cardTheme.js (510 lines, ~385 require() calls, 7 themes x 54 images) — zero Asset.fromModule/loadAsync/prefetch anywhere in the app; static require() resolves to a build-time integer asset ID in Metro, not a runtime image load; already investigated and closed as a misconception in commit dfa8339 (2026-06-18), documented in archive/PROJECT_NOTES.md:1194-1202"
---

## Problem

## PERF-1. cardTheme.js loads 7 themes × 53 images at startup

**Effort:** 30-60 minutes (combined with CQ-6)
**Risk if ignored:** Slower cold-start launch on low-end Android, ~50MB+ peak memory baseline

(Carried over unchanged from v2 — this is genuine work that's still pending. The fix recipe is in v2; same approach applies.)

## Verified 2026-08-14

The premise doesn't hold against how React Native/Metro actually handles images, and
this was already independently discovered and documented before this restructure even
started.

A static `require("../assets/.../x.png")` call is resolved at **build time** into a
small integer asset ID by Metro's asset plugin — it is not a runtime file read or
decode. Evaluating `game/cardTheme.js` at import time just builds plain JS objects of
those small numbers. The actual image bytes are only fetched and decoded by React
Native's image pipeline when an `<Image source={...}>` for that specific asset is
actually rendered on screen — lazily, per visible card, completely independent of how
many `require()` calls exist in the source file.

Current numbers, verified directly: **7 themes, 54 images each** (52 rank/suit cards +
`card_back` + `joker`), plus 7 small preview images — ~385 `require()` calls total in
`game/cardTheme.js`. Up from the ticket's "53 images" (true per-theme count is 54; a
theme — wizards/HP — and the total count changed since this was filed). The count was
never the actual issue either way: whether it's 53, 54, or 500 requires, none of them
trigger a runtime load. Confirmed by a repo-wide search for `Asset.fromModule`,
`.loadAsync()`, `Image.prefetch()`, `expo-asset` usage — zero hits anywhere in app code.

This exact conclusion was reached and documented on 2026-06-18, commit `dfa8339`
("docs: correct PERF-1/PERF-2 (misconception) + record joker app-size win"), recorded in
`archive/PROJECT_NOTES.md:1194-1202`: "NOT a real startup issue... The real lever was app
download size, not startup time." That download-size lever was addressed separately
(joker downscale, thumbnail JPEG conversion) and isn't part of this ticket.

Verdict is `moot`, not `fixed` — no code changed to address memory/cold-start because
the described mechanism doesn't exist. If cold-start or memory *is* ever a real measured
problem on a low-end device, it needs fresh on-device profiling (TTI, actual memory), not
a `require()`-count argument — this ticket's theory doesn't predict a real cost.

*Update 2026-08-19: the "combined with CQ-6" effort estimate in the Problem block above
no longer points at live work — [[CQ-6]] was itself closed `moot` on 2026-08-19.*


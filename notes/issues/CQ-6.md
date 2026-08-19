---
id: CQ-6
type: quality
area: theming
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-19
evidence: "game/cardTheme.js is still one file, 510 lines, 7 themes, 386 require() calls; file's own header comment (lines 2-3) states RN require() paths must be static literals, the exact constraint the deferral reasoning rests on; closed moot 2026-08-19 -- the split was re-examined and rejected again, so the file is intentionally monolithic rather than pending"
---

## Problem

**CQ-6 — DEFERRED (low value).** `cardTheme.js` is already an isolated
theme module; splitting it into 7 per-theme files + an index that re-imports
them all is pure file-count churn with no functional benefit (the requires are
build-time asset refs either way), and a mistyped path would silently break a
theme. Not worth the risk.

(Checklist-line summary — fuller v2 writeup deleted from the repo.)

## Verified 2026-08-15

`game/cardTheme.js` is still one monolithic module — 510 lines, 7 themes (classic, neon,
cowboy, girly, wizards, gothic, pirate), 386 `require()` calls, no split into per-theme
files anywhere in the repo. Matches the ~385-count figure independently confirmed during
the [[PERF-1]] verification pass.

The deferral reasoning holds, and the file's own header comment (lines 2-3) makes the
case even stronger than the original note did: React Native's Metro bundler requires
`require()` arguments to be static string literals it can resolve at build time — no
variables, no dynamic paths. Splitting into 7 files would not reduce the require() count
(same ~55 static requires per theme, just relocated), would not enable lazy-loading
(Metro bundles all reachable requires regardless of file boundaries for a mobile app —
no route-based chunking to exploit), and would add an index file that re-imports and
re-exports all 7 (import surface goes up, not down). The stated risk — a mistyped
relative path silently breaking a theme — would only be introduced by the split, not
fixed by it.

Marked `open` rather than `moot`/`fixed` because this was a deferral decision, not a fix
— the code was never expected to change, and it hasn't. This verification confirms the
deferral's reasoning is still valid today, not that anything was resolved. No fix
sketch — the original judgment call stands.

## Closed moot 2026-08-19

Re-examined and closed without changing the code. Nothing new was found — the 2026-08-15
reasoning holds in full: Metro requires static string literals, so a 7-way split
relocates the same ~55 requires per theme without reducing them, unlocks no lazy-loading
(a mobile bundle has no route-based chunking to exploit), adds an index module that
re-imports all 7, and introduces the one real failure mode here — a mistyped relative
path silently breaking a theme.

Reclassified from `open` to `moot` because `open` was misleading: it read as pending work
in the issue board's "Needs attention" view, when the actual decision has been "don't do
this" twice over. Verifying a split would also require eyeballing all 7 themes on a
device, so leaving it nominally open was quietly parking a device-test cost against a
change with no benefit.

If `cardTheme.js` is ever revisited, the trigger should be a measured problem (cold-start
or memory profiled on a real low-end device — see [[PERF-1]], also moot), not the file's
line count.


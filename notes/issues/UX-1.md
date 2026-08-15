---
id: UX-1
type: ux
area: ui
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "screens/CardThemeScreen.js:347 (dotActive), :355 (applyBtn) both #7fb3ff; no #e94560 anywhere in the file; commit aeeca46 (contrast fix: applyBtnText -> #08111f dark text, new applyBtnTextLight style for dimmed/confirmed states)"
---

## Problem

## UX-1. CardThemeScreen still uses red accent

**Effort:** 5 minutes
**Risk if ignored:** Visual inconsistency with the rest of the app post-UX-3 sweep

### What's happening

DEEP_REVIEW v2's UX-3 standardized `#e94560` red spinners to `#7fb3ff` blue across the app. `CardThemeScreen.js` was missed — its theme-selection accent (the active dot, the Apply button, the confirmed-state colors) are all still red.

### Why this matters

When you open Profile → Card Theme, the screen visually clashes with the rest of the polished UX. Tiny issue but jarring.

### The fix

Find every `#e94560` in `CardThemeScreen.js` (excluding the actual card theme color swatches — those are theme content) and replace with `#7fb3ff`. Or just verify each one — if it's a structural UI element, swap it; if it's content (e.g. a theme preview), leave alone.

## Verified 2026-08-15

No `#e94560` remains anywhere in `screens/CardThemeScreen.js` today. Both structural
elements named in the bug are `#7fb3ff`: the active dot (`dotActive`, line 347) and the
Apply button (`applyBtn`, line 355). Card theme preview images are `Image` sources from
`getThemePreviewImage(key)`, not hardcoded hex — so the original bug's "leave theme
content alone" caveat doesn't even apply here.

The archive's claim that this was more than a trivial swap checks out in the diff itself.
Commit `aeeca46` shows: `applyBtnDimmed` background changed to a dark-navy tone (no longer
dark red); `applyBtnText` color changed to `#08111f` (dark text on the light blue button,
fixing a ~2.1:1 contrast failure); and a new `applyBtnTextLight` style (`#ffffff`) added,
applied conditionally via `(isCurrentActive || confirmed) && styles.applyBtnTextLight` —
present verbatim in today's file at lines 238-247/371-373. The "dark bg → dark text, dimmed/
green bg → light text" per-state logic described in the archive is real, not just claimed.

One adjacent, non-blocking note: this fix predates `game/colors.js` (the later semantic
color-token module) and was never migrated to import from it — the hex values happen to
match the tokens defined there (`accent = "#7fb3ff"`), but `CardThemeScreen.js` still uses
inline literals. Not a regression of UX-1, just an unrelated adoption gap.

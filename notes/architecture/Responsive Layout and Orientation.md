---
verified: 2026-08-15
---

# Responsive layout & orientation architecture

*(Originally merged from RESPONSIVE_LAYOUT_PLAN.md into PROJECT_NOTES.md on 2026-06-04;
migrated here 2026-08-15 as part of the docs restructure. `##` subheads demoted to `###`
per the migration table.)*

> **Status: orientation is LOCKED.** This doc's original premise was "never force
> orientation, adapt to aspect ratio." That premise was reversed 2026-06-04 — the app
> is **portrait-locked everywhere except Solitaire** (landscape-locked). See
> **Orientation policy** below for the current rule and why. The **responsive
> *sizing*** guidance here (`useLayoutMode()`, measured width/height) is still in force
> and still governs scaling within the locked orientation — only the "free rotation /
> Fold-square" goal was dropped.

### Why not just force landscape? (historical rationale)

Forcing landscape was *originally* rejected — reversed 2026-06-04 (see Orientation
policy below). Kept here for the foldable/tablet rationale if that's ever revisited:

- **Foldables break the assumption.** A Samsung Fold unfolded is roughly square
  (~1:1). "Landscape = wide" isn't true there. A forced-landscape lock can look broken
  or waste enormous space.
- **Tablets** are often used in portrait and have plenty of room either way.
- **Forced rotation is a UX cost** — making the player physically rotate the phone,
  then rotate back for menus, is friction.

Instead: measure the available space and choose a layout that fits it. This is correct
on a phone in portrait, a phone in landscape, a Fold in any state, and a tablet.

### The mental model: "wide mode" vs "tall mode"

Don't think in terms of "portrait/landscape." Think in terms of the aspect ratio of the
space available right now:

- **Wide mode:** available width is meaningfully greater than height (ratio > ~1.2).
  Lay things out in rows; spread melds/piles horizontally; put side panels beside the
  play area.
- **Tall mode:** available height is meaningfully greater than width (ratio < ~0.85).
  Stack things vertically; play area on top, hand on the bottom.
- **Square-ish mode (the Fold case):** ratio between ~0.85 and ~1.2. Neither strongly
  wide nor tall. Use a balanced layout — this is the case people forget, and it's
  exactly the Fold. Pick whichever of wide/tall degrades more gracefully, or a
  dedicated balanced arrangement for the most important screens.

Thresholds are starting suggestions; tune per screen.

### How to detect it (React Native)

Use `useWindowDimensions()` — it updates live on rotation AND on fold/unfold, so
layouts recompute automatically. Do NOT read `Dimensions.get()` once at module load (it
won't update).

```js
import { useWindowDimensions } from "react-native";

function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const ratio = width / height;
  if (ratio > 1.2) return "wide";
  if (ratio < 0.85) return "tall";
  return "balanced"; // Fold / square-ish
}
```

Drive layout off `mode` (and off raw `width`/`height` for sizing). Because it's a hook
reading `useWindowDimensions`, it re-runs on every dimension change — no orientation
listener needed.

**Hooks-order reminder:** `useWindowDimensions()` and `useLayoutMode()` are hooks —
they must be called before any early return in the component, like all other hooks
(CLAUDE.md §2.1).

### Orientation policy

**Current policy:**
- The app is portrait-locked app-wide, with Solitaire as the sole landscape exception.
  Solitaire locks `LANDSCAPE` on focus and restores `PORTRAIT_UP` on exit; the
  app-root lock lives in `App.js`, the override in `SolitaireGameScreen.js`. Both use
  `expo-screen-orientation` — pure JS, reversible, no rebuild.
- **Why the reversal:** Solitaire genuinely needs the width (7-10 tableau columns +
  long stacks); every other screen was designed portrait-first and looks worse forced
  wide. The app ships Android phone-first to Google Play, so reworking ~21 screens for
  Fold/tablet free-rotation wasn't worth it.
- **What still holds:** responsive *sizing* (`useLayoutMode()` + measured
  width/height) is unchanged and still governs how cards/columns scale *within* the
  locked orientation, so the app still adapts across phone sizes. It just no longer
  pursues arbitrary rotation or the square-ish Fold case.

*(The original "never lock orientation" policy was reversed here; `app.json` stays
`"default"` but the runtime lock decides.)*

### Sizing cards responsively

Cards should size off the available space, not fixed pixels. `components/Card.js`
already scales off `useWindowDimensions()` width with a `BASE_WIDTH` ratio clamp —
extend that thinking:

- In **wide mode**, there's more horizontal room: cards can be a bit larger and spread
  out; fewer rows wrap; the hand may not need to scroll at all.
- In **tall mode**, vertical room is the constraint: tighter card overlap in stacked
  piles; the hand row may scroll horizontally.
- Compute a target card size from `min(availableWidth / cardsPerRow, availableHeight /
  rowsNeeded)` so cards never overflow either axis.

The win condition: **the hand fits without horizontal scrolling whenever there's room
for it.** Reducing forced scrolling is a primary goal — it also reduces the drag-vs-scroll
gesture conflict.

### Interaction with drag-and-drop

- More available width → more cards fit on screen → less horizontal scrolling needed →
  fewer places where scroll-vs-drag conflict can occur.
- Drag-and-drop is done for Solitaire Klondike/FreeCell/Spider (landscape) with
  immediate touch-and-move activation (not long-press), via
  `components/useSolitaireDrag.js`. See [[Open Questions]].

### Rollout (done — historical)

Piloted on Solitaire, then extended: all five Solitaire variants now have landscape
layouts, and drag-and-drop landed on Klondike/FreeCell/Spider. The other card-heavy
games (Conquián, Rummy, Poker) remain candidates for a responsive/landscape pass *if* a
specific game is judged to benefit — not done app-wide as of 2026-08-15.

### Anti-goals (don't do these)

- Don't force a screen into landscape unless it genuinely needs it (only Solitaire
  does).
- Don't build two totally separate component trees for portrait vs landscape if one
  responsive tree can adapt — that doubles maintenance.
- Don't read dimensions once at module load; always use the live hook.
- Don't hard-code pixel card sizes that assume a specific screen.
- Don't ignore the square-ish/Fold case — it's the one most likely to look broken if
  you only test phone portrait + landscape.

### Definition of done (per screen)

- Looks correct and uses space well in: phone portrait, phone landscape, square-ish
  (Fold-like).
- No content overflow or clipping in any of the three.
- Cards readable; hand fits without scrolling when space allows.
- All hooks (including `useWindowDimensions`/`useLayoutMode`) are above all early
  returns.
- Reduced-motion still respected for any animations on the screen.
- Committed with a clear message; tested on at least phone portrait + landscape,
  ideally a Fold-like configuration.

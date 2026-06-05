# RESPONSIVE_LAYOUT_PLAN.md — Aspect-Ratio Responsive Layout Architecture

> ⚠️ **Status (2026-06-04): orientation is now LOCKED.** This doc's original
> premise was "never force orientation, adapt to aspect ratio." That premise was
> reversed — the app is **portrait-locked everywhere except Solitaire** (which is
> landscape-locked). See the **Orientation policy** section below for the current
> rule and why. The **responsive *sizing*** guidance here (`useLayoutMode()`,
> measured width/height) is still in force and still governs scaling within the
> locked orientation — only the "free rotation / Fold-square" goal was dropped.

> Goal: gameplay screens that look good on **any** screen shape — phone portrait, phone landscape, and foldables/tablets (e.g. Samsung Fold, which is nearly square unfolded) — **without forcing orientation**.
>
> Core principle: **lay out based on the space you actually have, not a locked orientation.** A forced "landscape" lock breaks on a Fold and wastes space on tablets. Responding to the live width/height is robust everywhere.

---

## Why not just force landscape?

Forcing landscape was considered and rejected:

- **Foldables break the assumption.** A Samsung Fold unfolded is roughly square (~1:1). "Landscape = wide" isn't true there. A forced-landscape lock can look broken or waste enormous space.
- **Tablets** are often used in portrait and have plenty of room either way.
- **Forced rotation is a UX cost** — making the player physically rotate the phone, then rotate back for menus, is friction.

Instead: **measure the available space and choose a layout that fits it.** This is correct on a phone in portrait, a phone in landscape, a Fold in any state, and a tablet.

---

## The mental model: "wide mode" vs "tall mode"

Don't think in terms of "portrait/landscape." Think in terms of the **aspect ratio of the space available right now**:

- **Wide mode:** available width is meaningfully greater than height (e.g. ratio > ~1.2). Lay things out in rows; spread melds/piles horizontally; put side panels beside the play area.
- **Tall mode:** available height is meaningfully greater than width (ratio < ~0.85). Stack things vertically; play area on top, hand on the bottom.
- **Square-ish mode (the Fold case):** ratio between ~0.85 and ~1.2. Neither strongly wide nor tall. Use a balanced layout — this is the case people forget, and it's exactly the Fold. Pick whichever of wide/tall degrades more gracefully, or a dedicated balanced arrangement for the most important screens.

Thresholds are starting suggestions; tune per screen.

---

## How to detect it (React Native)

Use `useWindowDimensions()` — it updates live on rotation AND on fold/unfold, so layouts recompute automatically. Do NOT read `Dimensions.get()` once at module load (it won't update).

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

Drive layout off `mode` (and off raw `width`/`height` for sizing). Because it's a hook reading `useWindowDimensions`, it re-runs on every dimension change — no orientation listener needed.

**Hooks-order reminder:** `useWindowDimensions()` and `useLayoutMode()` are hooks — they must be called before any early return in the component, like all other hooks (see CLAUDE.md §2.1).

---

## Orientation policy

> ⚠️ **UPDATED 2026-06-04 — orientation IS now locked.** The "rotate freely"
> stance below was reversed.

**Current policy:**
- The app is **portrait-locked app-wide**, with **Solitaire as the sole landscape
  exception**. Solitaire locks `LANDSCAPE` on focus and restores `PORTRAIT_UP` on
  exit; the app-root lock lives in `App.js`, the override in
  `SolitaireGameScreen.js`. Both use `expo-screen-orientation` — pure JS,
  reversible, no rebuild.
- **Why the reversal:** Solitaire genuinely needs the width (7–10 tableau columns
  + long stacks); every other screen was designed portrait-first and looks worse
  forced wide. We ship **Android phone-first** to Google Play, so reworking ~21
  screens for Fold/tablet free-rotation wasn't worth it.
- **What still holds:** responsive *sizing* (`useLayoutMode()` + measured
  width/height) is unchanged and still governs how cards/columns scale *within*
  the locked orientation, so the app still adapts across phone sizes. We just no
  longer pursue arbitrary rotation or the square-ish Fold case.

**Original (superseded) policy, kept for rationale:**
- ~~**Do NOT lock orientation.** Let the OS rotate freely. The layout adapts via `useLayoutMode()`.~~
- ~~`expo-screen-orientation` is not strictly required; the aspect-ratio approach is the primary mechanism.~~
- ~~`app.json` should allow rotation (`"orientation": "default"`).~~ (`app.json` is *still* `"default"`; the lock is applied at runtime instead — reversible, no rebuild.)

---

## Sizing cards responsively

Cards should size off the available space, not fixed pixels. `components/Card.js` already scales off `useWindowDimensions()` width with a `BASE_WIDTH` ratio clamp — extend that thinking:

- In **wide mode**, there's more horizontal room: cards can be a bit larger and spread out; fewer rows wrap; the hand may not need to scroll at all.
- In **tall mode**, vertical room is the constraint: tighter card overlap in stacked piles; the hand row may scroll horizontally.
- Compute a target card size from `min(availableWidth / cardsPerRow, availableHeight / rowsNeeded)` so cards never overflow either axis.

The win condition for "did this work": **the hand fits without horizontal scrolling whenever there's room for it.** Reducing forced scrolling is a primary goal (it also reduces the drag-vs-scroll gesture conflict — see below).

---

## Interaction with drag-and-drop

Responsive layout and the drag-and-drop fix are complementary:

- More available width → more cards fit on screen → **less horizontal scrolling needed** → fewer places where scroll-vs-drag conflict can occur.
- Where scrolling IS still needed, the drag fix still applies: `GestureHandlerRootView` at root, long-press to activate drag, axis-aware arbitration (horizontal motion scrolls, vertical motion drags). See CLAUDE.md §6.
- Don't rely on layout alone to dodge the gesture conflict — fix the gesture handling properly too.

---

## Rollout plan (pilot first)

1. **Pilot on Solitaire.** It's the most space-starved game (7–10 tableau columns), single-player, tap-based (no drag dependency). It benefits most from responsive layout and is the clearest signal of success. Make `SolitaireGameScreen` responsive via `useLayoutMode()` and responsive card sizing.
2. **Evaluate on real devices:** phone portrait, phone landscape, and if possible a Fold/tablet or an emulator configured as one. Confirm no overflow, no wasted space, no broken layouts in the square-ish/balanced case.
3. **If it feels good, extend** the same `useLayoutMode()` pattern to the other card-heavy games (Conquián, Rummy, Poker), one at a time, committing each separately.
4. **Menus/setup screens** can stay simple (they're not space-starved), but they should still not *break* in any orientation — verify they're scrollable and don't overflow.

---

## Anti-goals (don't do these)

- ❌ Don't force landscape globally.
- ❌ Don't build two totally separate component trees for portrait vs landscape if one responsive tree can adapt — that doubles maintenance.
- ❌ Don't read dimensions once at module load; always use the live hook.
- ❌ Don't hard-code pixel card sizes that assume a specific screen.
- ❌ Don't ignore the square-ish/Fold case — it's the one most likely to look broken if you only test phone portrait + landscape.

---

## Definition of done (per screen)

- Looks correct and uses space well in: phone portrait, phone landscape, square-ish (Fold-like).
- No content overflow or clipping in any of the three.
- Cards readable; hand fits without scrolling when space allows.
- All hooks (including `useWindowDimensions`/`useLayoutMode`) are above all early returns.
- Reduced-motion still respected for any animations on the screen.
- Committed with a clear message; tested on at least phone portrait + landscape, ideally a Fold-like configuration.

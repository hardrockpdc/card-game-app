---
verified: 2026-08-15
---

# Open strategic context

So future sessions understand Pedro's past decisions and don't re-litigate them
without cause.

- **Considered switching to native Kotlin, considered a full rewrite. Decided: stay
  on React Native.** A card game is not performance-limited, and the main past
  frustration (drag-and-drop) was caused by setup gaps (no `GestureHandlerRootView`,
  raw `PanResponder` instead of gesture-handler), not by RN being incapable. If a
  rewrite comes up again, make Pedro justify it against this conclusion before
  helping.
- **Drag-and-drop is DONE** (2026-06-04): `GestureHandlerRootView` at root +
  `react-native-gesture-handler`, immediate touch-and-move activation (tap-to-move
  kept as a fallback). Shipped for Solitaire Klondike / FreeCell / Spider in
  landscape via `components/useSolitaireDrag.js` + `getLegalTargets` in
  `game/solitaire.js`. Pyramid/TriPeaks stay tap (match/collect games). Pure JS, no
  rebuild. A 2026-07-05 follow-up added a real fly/FLIP animation for Solitaire's
  tap-to-move path specifically — drag-and-drop itself still snaps instantly on a
  successful drop, only springs back on an invalid one. See [[IMP-8]].
- **Layout direction: orientation is LOCKED** (changed 2026-06-04). The app is
  portrait-locked everywhere except Solitaire (landscape-locked). This reverses an
  earlier "responsive to aspect ratio, not forced orientation / Fold-first" stance —
  the app ships Android phone-first, so Fold/tablet free-rotation was deprioritized.
  Responsive _sizing_ (`useLayoutMode()`) still applies within the locked
  orientation.

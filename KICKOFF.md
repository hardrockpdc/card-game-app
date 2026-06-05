# KICKOFF.md — First Tasks for Claude Code (VS Code)

> Paste tasks from here one at a time into Claude Code. Do them **in order** — each builds on the last. Don't batch them; review each diff before accepting (Normal or Plan mode).
>
> Claude Code: follow `CLAUDE.md` (challenge-first behavior + hard rules) and, for layout work, `RESPONSIVE_LAYOUT_PLAN.md`. Diagnostic-first on anything risky. Commit after each task with a clear message and tell me what to test.

---

## Task 0 — Orient yourself (read-only, no edits)

Read `CLAUDE.md`, `RESPONSIVE_LAYOUT_PLAN.md`, `DEEP_REVIEW.md`, and `PROJECT_NOTES.md`. Then read `App.js`, `components/Card.js`, and `babel.config.js`. Give me a 5-bullet summary of the current state and flag anything that contradicts these docs. **Make no changes.**

Goal: confirm you understand the project before touching it.

---

## Task 0.5 — Hooks-order diagnostic (read-only)

Scan every file in `screens/` for `useEffect`, `useState`, `useRef`, `useMemo`, and `useCallback` calls that appear **after** an early `return` statement. Report which files are affected and which hook calls are misplaced. Make no changes.

This is the #1 recurring crash in this project (see CLAUDE.md §2.1 — hit Poker, Conquián twice, Rummy). Do this before touching any screen files in Tasks 3 or 4 so we know exactly what we're stepping into.

---

## Task 1 — Verify the gesture/animation native stack (read-only diagnostic)

Do NOT change anything yet. Report:

1. Is `react-native-gesture-handler` installed, and is the app wrapped in `<GestureHandlerRootView style={{flex:1}}>` at the root of `App.js`? (I believe it is NOT wrapped — confirm.)
2. Is `react-native-reanimated` installed, and does `babel.config.js` include `'react-native-reanimated/plugin'` as the LAST entry in the plugins array? (Reanimated breaks silently if the plugin is missing or not last.)
3. Is `react-native-worklets` present? Reanimated 4.x requires it as a peer dependency (`0.8.x`). If it's missing or mismatched, that alone could explain animation/drag misbehavior.
4. Is `expo-haptics` installed? (Probably not yet.)

End with a clear yes/no on each and a recommendation for what Task 2 needs to fix.

---

## Task 2 — Wire up the gesture/animation foundation

Based on Task 1 findings, make ONLY the setup changes needed:

- Add `<GestureHandlerRootView style={{ flex: 1 }}>` as the OUTERMOST wrapper in `App.js` (outside ErrorBoundary or just inside it — it must wrap everything that uses gestures). Import it from `react-native-gesture-handler`.
- Create `babel.config.js` at the project root if it doesn't exist (this project currently has none). It must include `'react-native-reanimated/plugin'` as the LAST entry in the plugins array. A cache clear + rebuild is required after any babel change.
- If `react-native-worklets` is missing/mismatched for reanimated 4.x, install the correct version.
After: list every native change and tell me explicitly that I must **rebuild the dev client** (`npx expo run:android` or an EAS dev build) before any of this takes effect — Metro reload alone won't load new native modules. Commit.

**Stop here and let me rebuild + confirm the app still launches before continuing.**

---

## Task 3 — Responsive layout pilot: Solitaire

> **This task is pure JavaScript** (`useWindowDimensions` is built into React Native). It does NOT depend on the native rebuild from Task 2 — you can start it as soon as Task 2's code changes are committed, without waiting for the build to complete. The rebuild only gates Task 4.

Follow `RESPONSIVE_LAYOUT_PLAN.md`. Implement the `useLayoutMode()` hook (wide / tall / balanced via `useWindowDimensions`) and make `SolitaireGameScreen` responsive:

- Cards and tableau columns size off available space, not fixed pixels.
- Works in phone portrait, phone landscape, and square-ish (Fold) without overflow or wasted space.
- ~~Do NOT lock orientation; let it rotate freely.~~ **SUPERSEDED 2026-06-04:** orientation is now locked — app portrait-locked, Solitaire landscape-locked (runtime `expo-screen-orientation`). Responsive *sizing* still applies within the locked orientation. See `RESPONSIVE_LAYOUT_PLAN.md` → Orientation policy.
- Keep all hooks above all early returns. Keep reduced-motion handling and the Spider fly-away intact.

Use Plan mode — show me the layout plan before writing. Commit when done. Tell me what to test in all three shapes.

---

## Task 4 — Proper drag-and-drop (prove the feel)

Only after Task 2 is rebuilt and working. Install `expo-haptics` here (this is where it's first actually used — defer it no earlier). Build a SMALL drag test first, not the whole Arrange screen:

- A throwaway screen: a horizontally-scrolling row of cards + two drop zones.
- **Long-press (~200ms) to pick up a card**, then drag it into a drop zone.
- Use `react-native-gesture-handler` (`Gesture.Pan`, `Gesture.LongPress`) + `reanimated`, NOT raw PanResponder.
- Axis-aware: horizontal swipe scrolls the row; long-press-then-drag lifts a card and locks scroll.
- Add an `expo-haptics` tick on pickup and on drop.

This reproduces my exact past failure (drag out of a scrolling row). I'll run it and judge the feel. If it's good, we rebuild the real Conquián Arrange screen on this foundation. If it's bad even done right, that's real evidence for reconsidering the stack.

---

## Standing reminders for every task

- Challenge me first if a task is flawed or premature (CLAUDE.md §1).
- Diagnostic-first before risky multi-file changes (CLAUDE.md §3.1).
- Don't run `tsc` — this is a JS project (CLAUDE.md §2.2).
- Hooks before early returns, always (CLAUDE.md §2.1).
- Commit per task; tell me what to test; remind me when a rebuild is needed.
- Don't add libraries without a concrete near-term use (CLAUDE.md §2.6).

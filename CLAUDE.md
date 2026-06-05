# CLAUDE.md — Working Agreement for the Card Night project

> This file is read at the start of every Claude Code session. It defines **how to behave**, not just what the project is. Follow it unless I explicitly override it in a given message.

---

## 0. Who I am and what I want from you

I'm a **beginner developer** building a React Native / Expo card game app ("Card Night"). I do not have deep technical training. Explain new concepts briefly when you introduce them, and avoid unexplained jargon.

**Most important behavioral request:** Be a design partner, not an order-taker. I specifically want you to **push back on my ideas** when they're flawed, risky, or premature. I have a tendency toward grass-is-greener thinking and scope creep, and I rely on you to catch it. A yes-man is worse than useless to me.

---

## 1. Challenge-first behavior (do this on every non-trivial request)

Before implementing anything beyond a trivial edit:

1. **Interrogate the request.** Is this actually a good idea? What are the tradeoffs? What's the simplest version that solves the real problem?
2. **Surface risks and alternatives.** Name what could go wrong. Offer the simplest, most beginner-friendly approach even if I asked for something more complex. If I'm reinventing something, say so.
3. **Push back on scope.** If I'm asking for a big rewrite to solve a small problem, say that plainly. If I'm chasing a "fresh start" or "switch tools" urge, make me justify it before you help me do it. Rewrites are where projects die — treat them with suspicion.
4. **Question grass-is-greener moves.** "This other tool/library/pattern would be better" usually isn't. Make me prove the current approach actually can't work before helping me abandon it.
5. **Only implement once the approach is sound.** Don't rush to code. Plan first, get my buy-in, then build. Use Plan mode for anything multi-file or risky.

Be direct and honest. Disagree with me when you have good reason. Don't soften a real concern into mush, but stay kind and constructive. I would rather hear "this is a bad idea because X" than get a polished implementation of a mistake.

When I say "you decide," actually decide — state your reasoning and pick. Don't bounce it back to me.

Ask **one focused question at a time** when something is genuinely ambiguous. Don't ask about things you can determine by reading the code.

---

## 2. Hard technical rules (learned the painful way — do not violate)

### 2.1 Hooks order — the #1 recurring bug
**Every `useState`, `useRef`, `useEffect`, `useMemo`, `useContext` call MUST appear BEFORE every early `return` in a component.** A hook placed after an `if (...) return ...` causes "Rendered more hooks than during the previous render" and crashes the screen.

This has bitten this project at least four times (Poker, Conquián twice, Rummy). Whenever you add or move a hook in a game screen, **verify top-to-bottom that all hooks are above all early returns.** When editing a game screen, proactively scan for this even if it's not what I asked about.

### 2.2 This is a JavaScript project, not TypeScript
There is no `tsconfig.json` and the project is all `.js`. **Do not run `tsc`** to "verify" — it produces hundreds of fake errors because the project was never set up for TypeScript. Verify by checking that Metro bundles / the app runs, not by type-checking. (The `typescript` dependency was removed on 2026-06-02 — the project remains all-JS with no tsconfig.json. The rule still stands: don't run `tsc`.)

### 2.3 Don't strip cross-platform code
Even though distribution is currently **Android-only**, the codebase stays cross-platform (React Native). Do NOT remove `Platform.select` branches, iOS config, or platform abstractions to "simplify." They cost nothing to keep and preserve the option to ship iOS later. Android-only is a *distribution* decision, not a *code* decision.

### 2.4 Respect reduced motion in animations
Every animation must check `AccessibilityInfo.isReduceMotionEnabled()` and snap to the final state when enabled. This is an established pattern in `components/Card.js` and `SolitaireGameScreen.js`. Match it.

### 2.5 Native modules require a dev build
`react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `expo-screen-orientation`, `expo-haptics`, etc. only work in a compiled dev build, NOT Expo Go. I run a dev build (expo-dev-client). When adding a native module, remind me a rebuild is needed before it'll work.

### 2.6 Don't install libraries without a concrete plan to use them
Every native dependency adds app size, upgrade-conflict risk, and bug surface. "Might be nice someday" is not sufficient. Only add a dependency when there's a real, near-term use for it.

---

## 3. Process discipline

### 3.1 Diagnostic-first on risky cleanups
Before any multi-file deletion, refactor, or "remove all traces of X," **do a read-only diagnostic pass first**: report exactly what exists and where, then propose the surgical change. Do not blind-delete across files. (This has repeatedly saved us from breaking things.)

### 3.2 Commit after each logical unit of work
End each completed change with a git commit using a clear, conventional message (e.g. `fix(conquian): ...`, `feat: ...`, `cleanup: ...`, `docs: ...`). Show me the commit hash. Keep commits focused — one logical change per commit.

### 3.3 Always tell me what to test
After implementing, give me a short, concrete list of what to check on my device to confirm it worked — including likely failure modes to watch for.

### 3.5 Batch native changes before requesting a rebuild
Never prompt for a dev-client rebuild after each individual native-touching change. Collect all native changes for a logical unit of work first, then request a single rebuild. Rebuilds are slow — one per batch, not one per commit.

### 3.4 Verify before claiming done
Confirm the files compile (Metro/bundler, not tsc), confirm the specific changes landed, and report honestly what changed vs. what was skipped and why.

---

## 4. Child-safety / content note
This is a family-friendly card game. Keep all content, copy, and assets appropriate for all ages.

---

## 5. Project facts (quick reference)

- **Stack:** React Native 0.81.5, Expo SDK 54, React 19.1.0. JavaScript. Dev build via expo-dev-client.
- **Distribution:** Android-only (Google Play). Privacy policy must be hosted for Play submission. Cross-platform code stays intact regardless.
- **8 games across 9 game screens** (Blackjack has separate single-player + multiplayer screens): Blackjack (single + multiplayer), Solitaire (Klondike/Spider/etc.), Conquián, Rummy, Go Fish, Poker, Last Card, Wild Round.
- **Key files:**
  - `App.js` — root; provider nesting; navigation stack
  - `components/Card.js` — the card render + animation engine (flip via `animateReveal`, deal via `animateDeal`+`dealDelay`)
  - `game/conquian.js`, `game/rummy.js`, `game/solitaire.js`, etc. — pure game logic
  - `game/GameNetwork.js` — local TCP/UDP multiplayer
  - `game/tableThemes.js` — per-game table colors
  - `screens/*GameScreen.js` — per-game screens
- **Standard patterns:**
  - `hasMountedRef` set true *before* the fresh-deal `applyState` (so deals animate) and *after* the resume `applyState` (so restored games don't animate). Used in `ConquianGameScreen.js` and `RummyGameScreen.js`; Solitaire uses a different approach (`initialGameDispatched` ref).
  - Auto-save effects throttled to one write / 3s via a `lastSaveRef`.
  - Accent color `#7fb3ff` blue (error text stays `#e94560` red).
  - Responsive sizing via `scale()` / `scaleFont()` from `game/responsive.js`.
- **Reference docs in repo:** `DEEP_REVIEW.md` (open issues + tracker), `PROJECT_NOTES.md` (project state), `Animations.md` (animation spec), `RESPONSIVE_LAYOUT_PLAN.md` (responsive/orientation architecture), per-game specs (`CONQUIAN_SPEC.md`, etc.).

---

## 6. Open strategic context (so you understand my decisions)

- I considered switching to native Kotlin and considered a full rewrite. We concluded: **stay on React Native** — a card game is not performance-limited, and my main frustration (drag-and-drop) was caused by setup gaps (no `GestureHandlerRootView`, raw PanResponder instead of gesture-handler), not by RN being incapable. If I bring up rewriting again, make me justify it against this conclusion before helping.
- Drag-and-drop is **DONE** (2026-06-04): `GestureHandlerRootView` at root + `react-native-gesture-handler`, with immediate touch-and-move activation (tap-to-move kept as a fallback). Shipped for **Solitaire Klondike / FreeCell / Spider in landscape** via the reusable `components/useSolitaireDrag.js` hook + `getLegalTargets` in `game/solitaire.js`. Pyramid/TriPeaks stay tap (match/collect games). Pure JS, no rebuild.
- Layout direction: **orientation is LOCKED** (changed 2026-06-04). The app is **portrait-locked everywhere except Solitaire** (landscape-locked). This *reverses* the earlier "responsive to aspect ratio, NOT forced orientation / Fold-first" stance — we ship Android phone-first, so Fold/tablet free-rotation was deprioritized. Responsive *sizing* (`useLayoutMode()`) still applies *within* the locked orientation. See `RESPONSIVE_LAYOUT_PLAN.md` → Orientation policy.

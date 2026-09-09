---
id: BUG-21
type: bug
area: navigation
status: open
severity: high
opened: 2026-09-08
verified: 2026-09-08
evidence: "Same shape as the reproduced [[BUG-12]]: BackHandler.addEventListener inside a plain useEffect in ConquianGameScreen.js:1098, GameScreen.js:201, GoFishGameScreen.js:441, LastCardGameScreen.js:1129, PokerGameScreen.js:878, RummyGameScreen.js:387, SolitaireGameScreen.js:1504, plus LobbyScreen.js:464 and OnlineLobbyScreen.js:134. Every online game reaches its screen via OnlineLobbyScreen.js:96/:185 navigation.replace(...), and all of them quit via navigation.navigate(\"Home\") (~48 call sites). Not individually reproduced on device — inferred from identical code shape"
---

## Problem

**BUG-21. The Back-handler trap fixed for Who Am I almost certainly affects the other online games.**

[[BUG-12]] was reproduced, fixed and device-verified for Who Am I only. The mechanism that
caused it is not specific to that screen:

- `OnlineLobbyScreen` enters **every** online game the same way, via
  `navigation.replace(data.gameScreen, ...)` (`:96`) and `navigation.replace(info.screen, ...)` (`:185`).
- Every game screen quits via `navigation.navigate("Home")` rather than a reset —
  roughly 48 call sites across the screens.
- Every game screen registers its `BackHandler` in a plain `useEffect`, so the handler
  stays live while the screen is mounted-but-unfocused, and returns `true`.

That is the exact combination that trapped Back app-wide in Who Am I. So **Go Fish,
Conquián, Poker, Rummy and Last Card in online mode** are expected to behave the same
way. Blackjack (`GameScreen`) and Solitaire are single-player and reached through
`SinglePlayerSetup`, where `navigate("Home")` does pop correctly — their handlers are the
same shape but the stack unwinds, so no trap was observed during the sweep.

## Why this is open rather than fixed

Deliberately not changed blind. Eleven screens, a hooks-order rule (CLAUDE.md §2.1) that
has bitten this project four times, and a navigation change that alters back-stack
semantics is not something to apply across the board on inference alone. Each online game
should be reproduced on two devices the way Who Am I was, then fixed with the same two-part
change, then re-verified.

## Fix, when it's picked up

Per screen, mirroring [[BUG-12]]:

1. Move the `BackHandler` registration from `useEffect` to
   `useFocusEffect(useCallback(..., deps))`. Swapping one hook for another in place keeps
   hook order identical, which is what keeps §2.1 safe — do not relocate the hook.
2. Change the quit path to `navigation.reset({ index: 0, routes: [{ name: "Home" }] })`.

Note that fixing only step 1 is not sufficient and is actively confusing: it stops Back
being swallowed but leaves the stale game screen in the stack, so Back drops the player
back into the game they just left. That was observed directly while fixing [[BUG-12]].

Worth considering alongside: a single shared `useGameBackHandler(onQuit)` hook would let
all of these screens share one correct implementation instead of nine near-copies.

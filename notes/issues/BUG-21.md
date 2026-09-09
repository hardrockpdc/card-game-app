---
id: BUG-21
type: bug
area: navigation
status: fixed
severity: high
opened: 2026-09-08
verified: 2026-09-09
evidence: "Same shape as the reproduced [[BUG-12]]: BackHandler.addEventListener inside a plain useEffect in ConquianGameScreen.js:1098, GameScreen.js:201, GoFishGameScreen.js:441, LastCardGameScreen.js:1129, PokerGameScreen.js:878, RummyGameScreen.js:387, SolitaireGameScreen.js:1504, plus LobbyScreen.js:464 and OnlineLobbyScreen.js:134. Every online game reaches its screen via OnlineLobbyScreen.js:96/:185 navigation.replace(...), and all of them quit via navigation.navigate(\"Home\") (~48 call sites). Reproduced and fixed 2026-09-08. Verified on emulator-5554 with an online Go Fish room joined from emulator-5556: leaving the game lands on Home and Back from Home exits to NexusLauncherActivity, where before the fix Back stayed captured by the game screen. Solo path re-checked the same way via Blackjack. 50 suites / 595 tests green"
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

## Why this was held back at first

Deliberately not changed blind when [[BUG-12]] was fixed. Nine screens, a hooks-order rule
(CLAUDE.md §2.1) that has bitten this project four times, and a navigation change that
alters back-stack semantics is not something to apply across the board on inference alone.

It was picked up as its own unit of work immediately afterwards, with the reproduction
done first.

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


## Fixed 2026-09-08

Both halves of the [[BUG-12]] fix applied across all nine screens that register a
`BackHandler`: `ConquianGameScreen`, `GameScreen`, `GoFishGameScreen`,
`LastCardGameScreen`, `PokerGameScreen`, `RummyGameScreen`, `SolitaireGameScreen`,
`LobbyScreen` and `OnlineLobbyScreen`.

- The handler moved from `useEffect` to `useFocusEffect(useCallback(...))` so it stops
  intercepting while the screen is not focused.
- All 45 `navigation.navigate("Home")` call sites became
  `navigation.reset({ index: 0, routes: [{ name: "Home" }] })`, so leaving a game
  actually unwinds the stack instead of pushing a second Home above the game.

### On the hooks-order rule

The `useEffect` → `useFocusEffect` swap is done **in place**, which is what makes it safe:
the hook keeps its position, so nothing moves relative to any early return. That was
verified rather than assumed — each file's hook/return sequence was diffed against `HEAD`,
and the only differences are the one intended swap plus the added `useCallback`. No hook
changed position in any of the nine files.

Two earlier heuristic scans flagged `SolitaireGameScreen` as a violation; both were false
positives (a two-space-indented `if (` inside the `formatTime` helper, and the
`if (isLandscape) {` layout block). Worth recording because a naive "hook after a
two-space `if`" check will keep producing those.

### Verified

Online: a Go Fish room hosted on emulator-5554 and joined from emulator-5556. Leaving lands
on Home, and Back from Home exits to the launcher. Before the fix that same sequence left
Back permanently captured.

**Extended 2026-09-09.** The same leave-then-Back sequence was run on three more online
games — Conquián, Rummy and Last Card — each landing on Home and then exiting to the
launcher. With [[BUG-12]]'s Who Am I that is **five of the six online games confirmed on
device**. Only online Poker's leave path is un-exercised; it shares the identical change,
so this is a gap in evidence rather than a known risk.

Solo: Blackjack opened, Back showed its save prompt, Leave landed on Home, Back exited.
Solo games never showed the trap — their stack unwound correctly — so this confirms the
`reset` change did not break the path that already worked.

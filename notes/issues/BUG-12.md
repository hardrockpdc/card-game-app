---
id: BUG-12
type: bug
area: navigation
status: fixed
severity: high
opened: 2026-09-08
verified: 2026-09-08
evidence: "Reproduced on emulator-5554 (Android 36 dev build) 2026-09-08: host an online Who Am I room, Start Game, Back, Leave. Landed on Home, then every hardware Back press showed WhoAmIGameScreen.js:309's 'Leave game?' Alert — confirmed on the Stats screen and on Home. Alert string is unique to that file. Cleared only by force-stopping the app. After the fix, Back on Home exits to NexusLauncherActivity as expected; 48 suites / 577 tests still green"
---

## Problem

**BUG-12. After leaving an online Who Am I game, the hardware Back button was captured app-wide.**

`OnlineLobbyScreen` enters a game with `navigation.replace(...)` (`:96`, `:185`), and
`handleQuit` left with `navigation.navigate("Home")`. That combination pushed a *fresh*
Home route on top of the game screen instead of popping back to the existing one, so the
finished game stayed mounted underneath.

Its Back handler was registered in a plain `useEffect`, so it stayed live for as long as
the screen was mounted — visible or not — and it returns `true`, which swallows the
event. Result: from that point on, every hardware Back press anywhere in the app popped
up "Leave game? / You'll leave this game.", including on **Stats** and on **Home**.
Tapping Leave re-ran the same `navigate("Home")` and changed nothing. The user could not
Back out of any screen, or out of the app, until the process was killed.

Two independent defects stacked:

1. **Handler scope** — a screen-level `BackHandler` that keeps intercepting while the
   screen is not focused.
2. **Stack shape** — `navigate` where the intent was "unwind to Home".

Fixing only (1) is not enough, and this was confirmed the hard way mid-session: with the
handler focus-scoped but navigation untouched, Back stopped being swallowed but instead
*popped the pushed Home off* and dropped the player back into the room they had just
quit. Both halves are needed.

Found during the full device sweep on 2026-09-08.

## Verified/Fixed 2026-09-08

Two changes in `screens/WhoAmIGameScreen.js`:

- The Back handler moved from `useEffect` to `useFocusEffect(useCallback(...))`, so it
  unregisters on blur. `useFocusEffect` was already the house pattern here
  (`HomeScreen`, `ProfileScreen`, `AchievementsScreen`, `SolitaireGameScreen`). Swapping
  one hook for another **in place** keeps hook order identical, so CLAUDE.md §2.1 is
  satisfied by construction — re-checked anyway: last hook line 314, first return 346.
- `handleQuit` now uses `navigation.reset({ index: 0, routes: [{ name: "Home" }] })`,
  matching `OnboardingScreen.js:190` and `ProfileScreen.js:182`.

Device-verified end to end: the Leave prompt still appears while the game *is* focused
(intended), Leave lands on Home, and Back from Home now exits to the launcher.

## Still open elsewhere

The same shape exists in the other game screens — `BackHandler` in a plain `useEffect`,
quit via `navigate("Home")` — and every online game reaches its screen through the same
`OnlineLobbyScreen.replace(...)` path, so Go Fish, Conquián, Poker, Rummy and Last Card
are very likely affected in online mode by the identical mechanism. Only Who Am I was
reproduced and fixed here; the rest are tracked in [[BUG-21]] rather than being changed
blind across eleven screens in one pass.

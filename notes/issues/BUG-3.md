---
id: BUG-3
type: bug
area: multiplayer
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-14
evidence: "screens/LobbyScreen.js:312 (unmount cleanup), :439-440 (Back → Leave), :491 (Start Game) all call stopBroadcasting(); game/GameNetwork.js:404-416 confirms it stays idempotent; no freezeOnBlur configured anywhere in the app (repo-wide grep, zero hits), so the header-back/edge-swipe path is covered by the unmount cleanup firing reliably"
---

## Problem

## BUG-3. LobbyScreen broadcast keeps running when navigating to a game

**Effort:** 5 minutes
**Risk if ignored:** Same family of issue as v2's BUG-5 (UDP broadcast keeps running after game starts), but for the case where the lobby is left via a non-tap path

### What's happening

`LobbyScreen.js` has a host-side useEffect that returns `() => stopBroadcasting()` as cleanup. That cleanup fires when the lobby unmounts. **BUT** the start-game flow uses `navigation.replace(game.screen, ...)` — React Navigation may keep the previous screen mounted in some cases (especially with stack screens that have `freezeOnBlur` set or animations in progress).

We previously addressed the explicit "Start Game" path by calling `stopBroadcasting()` directly in `handleStartGame`. So that path is now belt-and-suspenders covered. But there are still other ways out of the lobby (Android back, navigation.goBack, etc.) where the cleanup might or might not fire reliably.

This is mostly belt-and-suspenders — the fix is to call `stopBroadcasting()` defensively in the `handleQuit` and BackHandler paths as well, not just in `handleStartGame`.

### Why this matters

If broadcast keeps running after the lobby is gone, other phones nearby see a "Pedro's game" entry that doesn't accept new joins. Minor but confusing for users.

### The fix

In `LobbyScreen.js`, look for the `handleQuit` / leave-lobby paths and the UX-5 BackHandler's "Leave" onPress. In each, add `stopBroadcasting()` before navigation. If `stopBroadcasting` is idempotent (which it is — internal `broadcastSocket` becomes null after first call), calling it multiple times is fine.

## Verified 2026-08-14

Enumerated every way the host can leave `LobbyScreen.js` (confirmed `OnlineLobbyScreen.js`,
the Firebase room-code screen, is a separate, unrelated screen that never calls
`stopBroadcasting` — this bug is specifically about the local UDP-discovery lobby):

1. **Tap "Start Game"** (`handleStartGame`) → explicit `stopBroadcasting()` at line 491
   before `navigation.replace(...)`. Covered directly.
2. **Android hardware back → "Leave Lobby?" confirm → "Leave"** → explicit
   `stopServer(); stopBroadcasting();` at lines 439-440 before `navigation.navigate("Home")`.
   Covered directly.
3. **Header back-arrow tap / edge-swipe pop** — no explicit handler exists for this path
   (only the client branch has a `beforeRemove` listener, and it only calls
   `disconnectFromHost()`, irrelevant here). This path relies entirely on the host-setup
   `useEffect` unmount cleanup at line 312. The specific risk the original report worried
   about — `freezeOnBlur` keeping the popped screen mounted so cleanup never fires — does
   not apply: a repo-wide grep for `freezeOnBlur`/`detachInactiveScreens` found zero hits,
   and the navigator is a standard `createNativeStackNavigator`, so a popped screen fully
   unmounts and the cleanup does fire.

`stopBroadcasting()` remains idempotent: `game/GameNetwork.js:410-415` guards on
`broadcastSocket` and nulls it after `close()`.

One correction to the archive's own resolution note: it describes a `handleQuit` function
handling the leave path. No function by that name has ever existed in this file's git
history (`git log --all -p` on `LobbyScreen.js` confirms). The underlying claim is still
accurate — the "quit/back" coverage is the BackHandler's "Leave" branch, not a separately
named function — just imprecisely described in the old note.

**Adjacent gap, out of this bug's scope:** `stopServer()` (the TCP server, distinct from
the UDP broadcast this bug is about) is only called on the Back→Leave path — not on Start
Game or the header-back path. Doesn't affect this verdict since BUG-3 is specifically about
`stopBroadcasting`, but worth its own ticket later if the goal becomes "nothing
network-related survives leaving the lobby."

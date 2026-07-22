# Online Reconnect Plan — surviving app backgrounding

**Status:** Phase 1 + Phase 2 BUILT and **device-verified** for Last Card
(2026-07-04 → 2026-07-21). Built so far:
- **Phase 1 (client drop):** shared infra (`onlineTransport.onClientJoined`-on-
  reappear + `onlineGetRoomCode`, `onlineRoom.rejoinRoom`), the shared hook
  `components/useOnlineReconnect.js`, and Last Card wiring (host pause/resume,
  client foreground rejoin, action gating, overlay). PAUSE uses a single boolean
  message (not PAUSE/RESUME types) to avoid a replay race.
- **Phase 2 (host drop) — added 2026-07-21:** the host's `onDisconnect` now sets
  room `hostConnected=false` instead of deleting the room (`onlineRoom.createRoom`);
  `onlineRoom.markHostConnected` flips it back + re-arms the handler on the host's
  return; `onlineTransport.onlineWatchHostConnected` lets a client read the flag;
  the hook pauses clients ("The host lost connection") on false + a grace
  countdown, resumes on true, and the host resends state on foreground.
  **Trade-off accepted:** a host that never returns leaves a small orphaned room
  (intentional leaves via `leaveRoom`/`onlineTeardown` still remove it; a TTL/
  scheduled sweep can clean orphans later). No security-rules change needed — the
  host updating its own room's `hostConnected` is already permitted.

**Key fix found during testing (2026-07-21):** the host-drop case failed at first
because App.js's global AppState `background` handler calls `stopServer()` /
`disconnectFromHost()`, both of which run `onlineTeardown()` in online mode —
**deleting the room (host) or the player slot (client) on every background**,
overriding the onDisconnect entirely. Fixed by skipping that teardown when
`getNetworkMode() === "online"` (App.js); online backgrounding is left to the
reconnect system. This was the true root cause of "host leaves for a second,
everyone gets disconnected."

**Remaining:** adopt the hook in Go Fish (replaces its half-built inline version),
Conquián, Rummy, Poker, Who Am I? — each small now that the mechanism exists and
is proven.

## The problem
Switching away from the app (to read a message, etc.) drops you from an online
game. On mobile the OS suspends a backgrounded app and kills its network socket.
Firebase's server-side `onDisconnect` handlers then run our cleanup:

- Host disconnect → **the whole room is deleted** (`onlineRoom.js:87`) → everyone dies.
- Client disconnect → **their player slot is removed** (`onlineRoom.js:125`) → host sees them "leave".

Because `onDisconnect` fires *server-side while the phone is asleep*, we can't
intercept it from the sleeping app. So the fix is **not** "stay connected" — it's
**"treat a drop as temporary: pause, then reconnect + resync when the app returns."**

## What already exists (and what's missing)
- `components/ReconnectOverlay.js` — a countdown "Game Paused" modal. ✅ reusable.
- **Go Fish only**: host detects a client drop (`onClientLeft`) → `startPause()` →
  broadcasts `PAUSE {name, deadline}` → 60s timer → on timeout ends the game.
- **Missing everywhere:**
  1. No `RESUME` is ever sent — nothing detects a player coming *back*.
  2. The online transport fires `onClientLeft` when a uid disappears from
     `players`, but **never fires `onClientJoined` when a uid reappears**
     (`onlineTransport.js:104`). So the host can't notice a reconnect.
  3. `joinRoom` refuses to join once the room is `"playing"`
     (`onlineRoom.js:113`) — so there's no way to re-add your slot mid-game.
  4. No `AppState` handling anywhere — nothing reacts to foreground/background.
  5. Only Go Fish has any of this; Last Card, Conquián, Rummy, Poker, Who Am I?
     have none.

## Good news: the security rules already allow reconnect
A returning client re-adding its own `players/$uid` slot is permitted by the
deployed rules (`$uid === auth.uid`, and `name` is present). **No rules change is
needed for the client-reconnect case.** (The host case is different — see Phase 2.)

## Design principles
1. **A drop is "away", not "left".** Pause the game; don't tear it down.
2. **Reconnect = re-attach + re-add slot + resync.** The transport already stores
   the latest of every message type in its own slot (`net/broadcast/<type>`,
   `net/private/<uid>/<type>`), and `onChildAdded` replays the latest on attach.
   So a client that re-attaches its listeners **automatically receives the current
   game state** — resync is mostly "re-attach listeners", not custom code.
3. **One shared mechanism.** Generalize the Go Fish pilot into a reusable hook so
   every game gets identical, tested behavior (not 6 copies).

## Phase 1 — Client reconnect (the common case) — RECOMMENDED FIRST
Covers a **non-host** player backgrounding briefly (the scenario you hit). The
host stays put and stays authoritative.

**Build:**
1. **Transport: fire `onClientJoined` on reappearance.** In the host's
   `players` `onValue` watcher, when a uid *appears* (not just disappears), call
   `serverListeners.onClientJoined?.({ id })`. (Online mode only; local TCP
   already fires it.)
2. **`rejoinRoom(code)` function** in `onlineRoom.js` — re-adds the caller's
   `players/$uid` slot **without** the `status === "waiting"` gate, but only if
   the uid is in the room's finalized `gamePlayers` (so randoms can't inject
   themselves mid-game). Re-registers `onDisconnect(playerRef).remove()`.
3. **`AppState` handling** (client side, in the shared hook): on returning to
   `active`, call Firebase `goOnline()`, `rejoinRoom(code)`, and re-attach client
   listeners. The per-type slot replay resyncs state automatically.
4. **Host side:** on `onClientLeft` for a real player → `startPause()` + broadcast
   `PAUSE`. On `onClientJoined` for a player who was paused → clear the timer,
   broadcast `RESUME`, and re-send current `GAME_STATE` + that player's
   `PRIVATE_HAND`. On timeout → end as today.
5. **Shared hook `useOnlineReconnect(...)`** wrapping the pause/resume state,
   `ReconnectOverlay`, AppState, and the host detect/resume logic — adopted by
   all game screens (start with Last Card + Go Fish, then the rest).

**Result:** a client can switch away and come back within the grace window (60s);
everyone is paused meanwhile, then the game resumes where it left off.

## Phase 2 — Host survival — BUILT for Last Card 2026-07-21 (was: the hard problem)
> **Implemented as described below, with decision (a) — accept orphaned rooms —
> taken.** See the Status block at the top for the concrete pieces. The rest of
> this section is the original design rationale, kept for context.

If the **host** backgrounds, `onDisconnect(room).remove()` deletes the room and
everyone dies. Surviving this is much harder because:

- While the host is asleep, **no one is authoritative** — the host runs the game
  logic. Clients can only wait (a pause is the best we can do).
- We'd change the host's `onDisconnect` to **not delete** the room (e.g., set
  `hostConnected = false` instead), show clients "waiting for host…", and on the
  host's return resume + resync.
- **Stale-room cleanup is the snag:** the rules only let the *host* delete the
  room. If the host never comes back, a client can't clean it up. Options:
  (a) accept small orphaned rooms (cheapest; revisit with a scheduled cleanup or
  TTL later), (b) relax the delete rule so a client can remove a room whose host
  has been gone past the grace window (more rules work + risk).

**Recommendation:** do Phase 1 first (covers the common "player checks a message"
case end-to-end). Treat Phase 2 as a follow-up with its own design pass, since it
touches the authority model and the security rules.

## Testing (2 devices, per phase)
- Phase 1: client backgrounds mid-turn → both show "Game Paused" countdown →
  client returns → game resumes, correct hands/turn. Then let the timer expire →
  clean game-over. Repeat with the client whose turn it is *not*.
- Phase 2: host backgrounds → clients wait → host returns → resume.

## Rough size
- Phase 1: transport tweak + `rejoinRoom` + AppState + a shared hook + wiring per
  game screen. Medium. Each game-screen adoption is small once the hook exists.
- Phase 2: authority/rules design + implementation + careful testing. Larger.

---
id: BUG-7
type: bug
area: multiplayer
status: partial
severity: medium
opened: 2026-08-15
verified: 2026-08-15
evidence: "screens/GoFishGameScreen.js migrated off its bespoke Phase-1 pilot logic (startPause/endForDisconnect/pausedRef) onto components/useOnlineReconnect.js, the same hook LastCardGameScreen.js uses -- onClientJoined/onClientLeft/LEAVE routing wired, reconnect.overlay replaces the direct ReconnectOverlay render, EndOfRoundModal gated on !reconnect.overlayVisible; deliberately kept Go Fish's original always-end-on-departure behavior (no remove-and-continue at 4+ players) rather than expanding scope; not yet 2-device tested"
---

## Problem

Surfaced during the Phase 1.3 sweep of `archive/PROJECT_NOTES.md`'s "Multiplayer session
(2026-06-18 → 06-20)" log (~lines 864-871), not present in the original tracker under its
own ID.

Original archived text: "**Mid-game reconnect — Phase 1 (Go Fish pilot) — AWAITING DEVICE
TEST.** Most MP games silently hang when a player drops mid-game (host detects via
`onClientLeft` but doesn't resolve the missing turn). Built a pause/countdown: new
`components/ReconnectOverlay.js` + Go Fish wiring → on a drop the host broadcasts `PAUSE`
with a 60s deadline..., everyone sees the overlay, and on timeout the game ends → Home.
Piloted on Go Fish only; needs a 2-device test before Phase 2 (reconnect handshake) and
Phase 3 (per-game remove-and-continue)."

## Verified 2026-08-15

The reconnect system was substantially rebuilt after this pilot — but the rebuild was
wired into **Last Card first**, not Go Fish, despite Go Fish being the original pilot
game. Go Fish was never migrated and still runs the original June 19 code.

`screens/GoFishGameScreen.js` imports and renders `ReconnectOverlay` directly (line 670)
but implements its own standalone pause/timeout logic inline (`startPause`,
`endForDisconnect`, lines 100-134, 249-283) — essentially unchanged since commit
`6c31952` ("feat(multiplayer): pause + countdown on mid-game drop (Go Fish, Phase 1)").
None of the later reconnect commits (`b23d7b5` Phase 1 rewrite, `7f8c0a5` host survival,
`7c59d66` quit-vs-drop, `d696f40` rejoin, `8d8de3e` debounce, `8db39d5` modal-stacking fix)
touch this file at all — all landed only in `LastCardGameScreen.js` via the shared
`components/useOnlineReconnect.js` hook.

**The original "silent hang" complaint is fixed for Go Fish**: `onClientLeft` (line 249)
does freeze play, start a 60s countdown via `ReconnectOverlay`, and cleanly end the game
and return everyone Home on timeout rather than hanging forever.

**But Go Fish never got actual reconnect capability.** `setServerListeners` only
registers `onMessage` and `onClientLeft` (lines 233-256) — there's no `onClientJoined`
handler, and the host never broadcasts a `RESUME` message anywhere in the file. Line
269's `if (msg.type === "RESUME") setPaused(null)` is dead client-side code with no
sender. **In practice: any drop in Go Fish — deliberate quit or accidental blip — always
ends the game after 60s.** A player who reconnects within the window gets no benefit.

Go Fish is missing every feature Last Card's `useOnlineReconnect` now has: no Phase 2
host-drop detection (`onlineWatchHostConnected`), no quit-vs-drop distinction (Go Fish
pauses 60s even on a deliberate Quit, not just an accidental drop), no remove-and-continue
at ≥4 players (`endForDisconnect` unconditionally ends the game), no self-connection-loss
overlay with Rejoin/Leave, no `AppState` foreground rejoin. `CLAUDE.md`'s own reconnect
bullet confirms this gap is known and still open — it says the hook is "wired into Last
Card... Next: adopt the hook in **Go Fish**/Conquián/Rummy/Poker/Who Am I?", with Go Fish
first on that still-undone list.

Minor secondary risk: Go Fish's `EndOfRoundModal` (line 638) isn't gated on the pause
state the way `CLAUDE.md` says any `useOnlineReconnect` adopter must be, to avoid
Android's two-stacked-Modal input trap (fixed for Last Card in `8db39d5`). Likely
low-probability today since `onClientLeft` only pauses during `state.phase === "playing"`
and the round modal only shows during `results` — but unguarded either way.

## Fixed 2026-08-15 (code migration; device test still needed)

Migrated `screens/GoFishGameScreen.js` off its bespoke pilot logic onto
`useOnlineReconnect`, exactly as the fix sketch specced: `role`/`getPlayerName`/
`isRealPlayer`/`broadcast`/`resendState`/`onPlayerGone`/`onEndGame`/`onHostEnded`/
`onSelfLeave` wired through the hook; `onClientLeft`/`onClientJoined` now call
`reconnect.hostHandleClientLeft`/`hostHandleClientJoined`; a client `LEAVE` message
routes to `hostHandleClientQuit`; a new `leaveMultiplayer()` (mirroring Last Card's)
sends `LEAVE` on client quit and announces `GAME_OVER_DISCONNECT`/`host_left` before
`stopServer()` on host quit — used by both `handleQuit` and the Android back-handler;
the direct `<ReconnectOverlay>` render is now `{reconnect.overlay}`; `EndOfRoundModal`
is gated on `!reconnect.overlayVisible`. Go Fish now gets everything Last Card has for
free: real Phase-2 host-drop detection, the self-connection-loss overlay with
Rejoin/Leave, `AppState` foreground rejoin, and — the actual point of this ticket — a
player who reconnects within the 60s grace window now actually resumes instead of the
game always ending regardless.

**Deliberately not added:** remove-and-continue at ≥4 players. Go Fish keeps its
original always-end-on-departure behavior — adding remove-and-continue would mean
touching `game/gofish.js`'s player-removal semantics, which is real new scope beyond
"migrate onto the existing hook," and wasn't asked for.

**Not device-verified.** This is networking/reconnect behavior — the same category as
[[ACC-2]]'s device-test gap, not [[BUG-6]]'s: the whole point of the fix is real
two-device drop/reconnect/backgrounding behavior, which unit tests can't cover. Verified
only by reading the code against Last Card's proven, already-device-tested pattern
(2026-07-21, 2026-08-03) and a Babel parse check. Stays `partial`, not `fixed`, until an
actual 2-device pass happens — same bar the original pilot itself was held to.

## Fix sketch (remaining)

Get a real 2-device test: drop a client mid-game, confirm the pause/countdown shows,
reconnect within 60s and confirm the game resumes (not just ends); separately test a
host backgrounding and returning, and a client's own network blipping (self-lost
overlay + Rejoin). Also confirms the minor secondary risk this ticket originally noted
(the modal-stacking guard) actually holds in practice.

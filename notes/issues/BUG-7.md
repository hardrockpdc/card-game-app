---
id: BUG-7
type: bug
area: multiplayer
status: partial
severity: medium
opened: 2026-08-15
verified: 2026-08-15
evidence: "screens/GoFishGameScreen.js:100-134,233-283 is still the original 2026-06-19 pilot (commit 6c31952), never migrated to components/useOnlineReconnect.js; no onClientJoined handler registered (:233-256), host never broadcasts RESUME, so :269's client-side RESUME handler is dead code; CLAUDE.md's own reconnect bullet lists Go Fish first on its still-undone 'Next: adopt the hook' list despite being the original pilot game"
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

## Fix sketch

Migrate `screens/GoFishGameScreen.js` off its bespoke pilot logic onto
`useOnlineReconnect`, the same way `LastCardGameScreen.js` does: wire `role`,
`getPlayerName`, `isRealPlayer`, `broadcast`, `resendState`, `onPlayerGone`, `onEndGame`
through the hook; replace the inline `onClientLeft` handler with
`reconnect.hostHandleClientLeft(id)` and add `onClientJoined: ({id}) =>
reconnect.hostHandleClientJoined(id)`; route a `LEAVE` message to
`hostHandleClientQuit`; replace the direct `<ReconnectOverlay>` render with
`{reconnect.overlay}`; gate `EndOfRoundModal`'s `visible` on `showRoundModal &&
!reconnect.overlayVisible`. This is exactly what `CLAUDE.md` already flags as "Next" —
not new scope, just confirming it's still undone. Needs a 2-device test afterward per the
project's stated verification bar.

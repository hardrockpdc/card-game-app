---
id: CQ-7
type: quality
area: multiplayer
status: open
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "LobbyScreen.js:255-313 HOST setup effect has empty deps at :313, closures over myName (from resolvedHostName state) never see later updates; same closure class the file already ref-patched for aiPlayersRef (comment at :220); but HostSetupScreen.js:78-97 and MultiplayerGamePickerScreen.js:84-85 both gate hostName before mount, so the risky path is currently unreachable"
---

## Problem

**CQ-7 — DEFERRED.** `LobbyScreen` handler closure stale-state risk — a
real concern, but it's multiplayer-lobby code; un-verifiable without two
devices. Worth doing alongside a device test session.

(Checklist-line summary — fuller v2 writeup, describing which handler and what exact
stale-state pattern, was deleted from the repo. The original bug's exact shape could not
be reconstructed; what follows is a plausible, evidence-backed match to the general
pattern described, not a confirmed reconstruction of the original finding.)

## Verified 2026-08-15

The pattern the ticket describes is present today, in the "handler registered once at
mount, closes over state instead of a ref" shape. `myName` (`LobbyScreen.js:146-148`) is
derived from `resolvedHostName`, a state variable that can be updated *after* mount by an
async host-bootstrap effect (`:227-243`, when `hostName` wasn't passed as a route param).
The "HOST setup" effect (`:255-313`) has an **empty dependency array** and registers
`setServerListeners({ onClientLeft, onMessage })` exactly once; both callbacks close over
`myName` and use it in `broadcastToClients` calls (`:275-282`, `:293-300`). Because the
effect never re-runs, these closures keep referencing whatever `myName` was at the single
moment the effect fired.

This is the exact bug class the file already patched once — a comment at line 220 ("Ref
so server-listener closures always see the latest AI list") describes fixing this
identical problem for the AI player list via `aiPlayersRef`. `myName` never got the
equivalent ref treatment; it's the asymmetric leftover of that same fix.

**However, both current call sites currently gate this off.** `HostSetupScreen.js:78-97`
only renders the "Go to Lobby" button after `isLoadingProfile` resolves, so `hostName` is
always already resolved by mount. `MultiplayerGamePickerScreen.js:84-85` explicitly
no-ops until the profile load finishes. So in the live app today, `hostName` is never
empty when `LobbyScreen` mounts as host — the async branch that would trigger the stale
closure is effectively dead code via current navigation, and `resolvedHostName` never
actually changes after mount in practice.

## Fix sketch

Mirror the existing `aiPlayersRef` pattern: add a `myNameRef` updated via a small effect
(`useEffect(() => { myNameRef.current = myName; }, [myName])`), and read
`myNameRef.current` instead of `myName` inside the `setServerListeners` closures at lines
275-282 and 293-300. Cheap, consistent with the codebase's existing convention for this
exact problem, and closes the latent gap even though it's not reachable through today's
call sites — protects against any future caller that navigates to `Lobby` with
`role: "host"` and no `hostName` param. Low urgency given it's currently unreachable.
Still needs a two-device pass to actually observe the symptom if it's ever exercised,
which the ticket itself flags as a blocker to full closure.

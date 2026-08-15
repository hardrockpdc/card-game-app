---
id: PERF-3
type: perf
area: multiplayer
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-14
evidence: "screens/MultiplayerGameScreen.js absent from working tree, deleted in commit 5ff6676 (2026-06-18); the underlying full-state-broadcast pattern survives today in all 5 current multiplayer screens (Conquian/GoFish/LastCard/Poker/Rummy) via game/GameNetwork.js and game/onlineTransport.js, neither of which diffs; game/lineProtocol.js:18-19 documents in present tense that full-state broadcasts run to tens of KB"
---

## Problem

## PERF-3. MultiplayerGameScreen broadcasts the full state on every minor change

**Effort:** 20 minutes
**Risk if ignored:** Unnecessary network traffic in multiplayer; could matter on slow Wi-Fi

### What's happening

Look at `MultiplayerGameScreen.js`'s `applyState`:

```javascript
function applyState(newState) {
  stateRef.current = newState;
  setGameState(newState);
  if (isHost) {
    broadcastToClients({ type: "GAME_STATE", ...toBroadcast(newState) });
  }
}
```

Every time the host's state changes, the *full* state is serialized to JSON and broadcast to every client. That includes:
- The full deck (52 cards × all their objects)
- Every player's hand (could be 4 players × 5 cards = 20 cards)
- Dealer state
- All metadata

For a Hit action, only ONE card moved from deck to hand. We send the whole state anyway because the protocol is "state replacement, not diff."

This is the same pattern noted in v2's CQ-12 (Network message shape inconsistencies) and the original GameNetwork.js comment about "last-write-wins."

### Why this matters

For 2-player Blackjack on home Wi-Fi, this is invisible. For 4-player Blackjack over a hotel Wi-Fi network with shared bandwidth, the full-state broadcast on every action can add real latency.

### The fix (deferred)

A proper diff protocol is a bigger project (CQ-12 territory). For v1, accept the cost. Mark this item as deferred and revisit when you have multiplayer-over-internet on the roadmap.

## Verified 2026-08-14

**The literal claim is dead on arrival:** `screens/MultiplayerGameScreen.js` does not exist
in today's tree (confirmed independently via `find` and `git log --diff-filter=D`), deleted
in commit `5ff6676` (2026-06-18, "cleanup: remove orphaned multiplayer Blackjack screen") —
same removal already established for [[BUG-1]] and [[PERF-1]]'s neighboring investigation.
A fix targeting that specific file is meaningless.

**But the underlying architectural pattern is very much alive**, just relocated: every
current multiplayer game — Conquián, Go Fish, Last Card, Poker, Rummy — uses the exact
same shape this ticket complained about. A single `applyState`/`broadcastState` function
re-serializes the entire public game state and broadcasts it via `broadcastToClients` on
every action, with no diffing anywhere in the transport layer (`game/GameNetwork.js` for
local TCP, `game/onlineTransport.js` for the Firebase relay). Architecturally identical to
the deleted screen's `applyState`, independently re-derived into five files instead of one.

One real mitigation the original ticket didn't anticipate: none of the five
`toPublic`/`toPublicState` functions send the raw deck array or other players' hand
contents — they send counts (`stockSize`, `handSizes`, `drawPileCount`, `cardCount`)
instead of card objects, and each player's own hand goes out separately as a private
`PRIVATE_HAND` message rather than folded into the broadcast. So the "52-card deck +
4×5-card hands serialized every time" specifics of the original writeup are no longer
literally accurate for current screens — the public payload is smaller than described.
But it's still a full snapshot of all public state on every single action, not a diff, and
`game/lineProtocol.js:18-19`'s own present-tense code comment confirms this isn't
hypothetical: "Full-state broadcasts are the largest thing on the wire and run to tens of
KB." [[BUG-6]]'s TCP-fragmentation problem (that same comment's neighboring context) is
corroborating, not incidental — large full-state broadcasts are exactly what made
fragmentation bite in the first place.

Also worth recording: the archive is internally inconsistent on this exact ticket — it
already marked PERF-3 `moot` elsewhere (citing the same `5ff6676` commit) but never
updated the detailed write-up carried forward above, which is a leftover verbatim
carry-over from the older v2 review. Exactly the kind of staleness this restructure exists
to catch.

**Not opening a new ticket for the surviving pattern** — it matches the original ticket's
own deferred conclusion almost exactly: "accept the cost... revisit when you have
multiplayer-over-internet on the roadmap." Worth reopening as a fresh low-priority item if
and when online play scales past small home-Wi-Fi groups, but not before.

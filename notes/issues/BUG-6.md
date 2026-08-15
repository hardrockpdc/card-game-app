---
id: BUG-6
type: bug
area: multiplayer
status: fixed
severity: low
opened: 2026-06-02
verified: 2026-08-14
evidence: "game/lineProtocol.js:31-49 (feedLines) wired into game/GameNetwork.js:86-130 (server) and :266-305 (client); commits 734dae9 (2026-06-02) + 371f2bd (2026-08-02); __tests__/lineProtocol.test.js 10/10 passing"
---

## Problem

## BUG-6. TCP messages aren't reassembled — large messages get silently dropped (multiplayer desync)

> **✅ FIXED 2026-06-02 (commit `734dae9`).** Both TCP receive handlers now buffer the incoming byte stream and parse only complete newline-terminated lines, carrying any partial remainder forward. Detail retained below for context. Still wants a two-device verification in a Poker/Conquián game.

**Found:** Deep-dive review, 2026-06-02
**Effort:** ~45 min (buffer + tests)
**Severity:** High — intermittent multiplayer desync / dropped actions, worse as game state grows
**Risk if ignored:** Clients miss state updates in Poker/Conquián/Last Card multiplayer; the board freezes or diverges with no error shown

### What's happening

`game/GameNetwork.js` reads incoming TCP data like this (both the server's per-client handler and the client handler):

```javascript
socket.on("data", (data) => {
  data
    .toString()
    .split("\n")
    .forEach((line) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line);
        ...
      } catch (_) {}   // <-- a fragmented message lands here and is dropped
    });
});
```

TCP is a **byte stream, not a message stream**. The OS can deliver a single `data` event that contains:

- a partial message (a JSON object split across two packets), or
- the tail of one message plus the head of the next.

The newline framing is correct in spirit, but there's **no buffer to hold a partial line between `data` events**. When a message is larger than one TCP segment (~1460 bytes on a typical LAN MTU), it arrives in pieces. The trailing partial line fails `JSON.parse`, hits the empty `catch`, and is **silently discarded**.

### Why this matters / when it bites

- Small messages (JOIN, single ACTION, ASSIGNED_ID) usually fit in one segment, so 2-player Blackjack often looks fine — which is why this hasn't been obvious.
- **Full-state broadcasts are large.** A Poker or Conquián `GAME_STATE` carries the deck plus every player's hand — easily over 1460 bytes. Those are exactly the messages that fragment and get dropped, so the more complex the game, the more likely a desync.
- This **compounds with PERF-3** (the host broadcasts the entire state on every action): big, frequent messages are the worst case for the missing reassembly.

### The fix

Buffer per connection and only parse complete newline-terminated lines, keeping the remainder for the next event. Standard line-framing:

```javascript
// server: one buffer per client socket (declare inside createServer callback)
// client: one module-level buffer for clientSocket
let buffer = "";
socket.on("data", (data) => {
  buffer += data.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      /* ...existing handling... */
    } catch (_) {}
  }
});
```

The senders already append `"\n"` to every message (`broadcastToClients`, `sendToClient`, `sendToHost`, the `ASSIGNED_ID` write), so the framing contract is intact — only the **receiver** needs the buffer. UDP discovery is unaffected (datagrams are message-bounded).

### Follow-up checks

- This is networking code, so it can't be unit-tested the way the pure logic is, but it's verifiable on two devices: start a Poker or Conquián multiplayer game and confirm the client board stays in sync across several actions (previously prone to freezing/diverging).
- Consider a tiny guard against an unbounded buffer (e.g. cap at a few hundred KB) — low priority on a trusted LAN.

## Verified 2026-08-14

Confirmed fixed, not just confidently claimed. `734dae9` (2026-06-02) added exactly the
per-connection buffer the report's fix section describes, inline in both TCP `data`
handlers in `GameNetwork.js`. On 2026-08-02, commit `371f2bd` (filed as audit item M2)
refactored that inline logic into a standalone pure function, `feedLines(buffer, chunk)`,
in `game/lineProtocol.js`, imported by both call sites (`GameNetwork.js:5`, used at
`:88` server-side and `:268` client-side).

That same refactor also added the buffer-size cap the original report only flagged as a
low-priority nice-to-have:

```js
export const MAX_LINE_BYTES = 1_000_000;
...
if (next.length > MAX_LINE_BYTES) {
  return { buffer: "", lines, overflow: true };
}
```

Both handlers check `framed.overflow` and destroy the socket (`GameNetwork.js:90-94`
server-side, `:270-274` client-side) instead of letting the buffer grow unbounded.

`__tests__/lineProtocol.test.js` (10/10 passing) directly covers both fragmentation
scenarios named in the bug report: a message split across two chunks (lines 24-32), and
a chunk containing one message's tail plus the next message's head (lines 34-38), plus 5
more tests for the overflow/cap behavior including a check that a legitimately large but
correctly-terminated batch is not falsely flagged as overflow.

Grepped all of `game/` for the original vulnerable `data.toString().split("\n").forEach(...)`
pattern — no remaining instances. `GameNetwork.js` is the only file in the repo with a TCP
`socket.on("data", ...)` handler, so there is no other unfixed call site.

**Residual gap, not closed by this fix:** the report's ask for two-device verification in a
live Poker/Conquián game has no record of ever happening — not in `CLAUDE.md`, not in
`notes/ops/Reconnect Plan.md`, not in the archived tracker itself. `CLAUDE.md` separately notes MP
Poker's end-game is still "parked" (doesn't reach a normal end state), so a full
multi-action Poker soak test under real LAN fragmentation hasn't occurred. The code-level
fix is solid and test-covered; field verification under real fragmentation conditions is
still outstanding. Worth a real two-device test next time Poker or Conquián multiplayer is
touched, but this no longer blocks anything — small messages were never the problem, and
the fix is structurally sound regardless of device confirmation.

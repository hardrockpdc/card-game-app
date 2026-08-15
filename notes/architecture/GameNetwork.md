---
verified: 2026-08-15
---

# How game/GameNetwork.js works

`game/GameNetwork.js` is the multiplayer transport façade. `setNetworkMode("local"|
"online")` picks which backend the functions below actually talk to — local TCP/UDP,
or the Firebase relay in `game/onlineTransport.js`. Every current export, confirmed
against the file directly (the archived version of this doc was missing several of
these):

**Mode:**
- `setNetworkMode(mode, config)` / `getNetworkMode()`
- `PROTOCOL_VERSION` — every outgoing message carries this; a mismatched client gets a
  `VERSION_MISMATCH` message and a friendly "Update Required" alert rather than
  garbled behavior.

**Host side:**
- `startServer()` — opens TCP port 7777
- `setServerListeners({ onClientJoined, onClientLeft, onMessage })` — any screen can
  take over
- `broadcastToClients(message)` — sends JSON to all connected players
- `sendToClient(clientId, message)` — sends to one specific player
- `stopServer()` — closes the port, kicks everyone
- `getClientCount()` / `getConnectedPlayers()` / `isLocalSessionActive()`

**Client side:**
- `connectToHost(ip, callbacks)` — connects to the host's TCP server
- `setClientListeners({ onMessage, onDisconnected })`
- `sendToHost(message)`
- `disconnectFromHost()`
- `getAssignedClientId()`

**UDP Discovery (local mode only):**
- `startBroadcasting(hostName, hostIp)` — host sends a UDP packet every 2s on port 7778
- `stopBroadcasting()`
- `startDiscovery(onGameFound)` — client listens on port 7778, fires the callback with
  `{ name, ip }`
- `stopDiscovery()`

**Framing:** both TCP data handlers buffer incoming bytes and parse only complete
newline-terminated lines via `game/lineProtocol.js`'s `feedLines()`, with a
`MAX_LINE_BYTES` cap that destroys the socket on overflow rather than growing
unbounded. See [[BUG-6]] for the full history — this was a real dropped-message bug,
fixed 2026-06-02, later extracted into its own module 2026-08-02.

**Message shape:** all 5 current multiplayer game screens except Who Am I? spread
public state directly into the broadcast envelope (`{ type: "GAME_STATE", ...pub }`);
Who Am I? nests it (`{ type: "GAME_STATE", state: pub }`) instead. Action-message field
naming also isn't fully consistent across games. No functional bug results — every
screen only ever parses its own messages — but see [[CQ-12]] for the full breakdown.

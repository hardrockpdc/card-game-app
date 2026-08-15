# Realtime Database security rules — explained

The rules live in [`database.rules.json`](database.rules.json). That file is
kept **comment-free on purpose**: the Firebase console's Rules editor rejects
anything but a single top-level `rules` key (JSON has no real comments, and the
`"//"` comment-keys people fake break the console paste with *"Line 2: Expected
'rules' property."*). This doc holds the explanation instead.

## What Firebase stores
Two top-level paths:

- **`rooms/*`** — online lobbies and the public in-game message relay.
- **`privateNet/*`** — per-player private state (poker hole cards, Go Fish and
  Rummy hands, the Who Am I? secret).

**Coins, profile, stats and achievements are LOCAL to each device**
(AsyncStorage) and never touch Firebase. Auth is anonymous (see
`game/firebase.js`), so `auth != null` mainly ties every write to a stable uid,
which powers the host/player ownership checks.

### Why private state is NOT under `rooms/`
Firebase read rules **cascade downward and cannot be revoked by a descendant**.
`rooms/$code` must stay readable as a whole subtree — `subscribeToRoom`,
`joinRoom`, `rejoinRoom`, `markHostConnected` and the zombie-room check each
read `rooms/<code>` in a single call, and a narrow rule on a child does not
authorise reading the parent. So anything private parked under `rooms/` is
readable by every player in the room, no matter what rule sits on it.

Private state therefore lives at `privateNet/$code/$uid`, whose read rule is
`$uid === auth.uid`. It previously sat at `rooms/$code/net/private/$uid`, which
meant **every player could read every opponent's hand** (fixed 2026-08-02).

## How to deploy
- **Console:** Realtime Database → **Rules** tab → paste the whole
  `database.rules.json` → **Publish**.
- **CLI:** `firebase deploy --only database` (`firebase.json` points at the file).

## Rule-by-rule
- **`.read: false` / `.write: false` (root)** — default deny. Nothing is readable
  or writable unless a deeper rule re-grants it. Rules only ADD access down the tree.
- **`rooms/$code`**
  - **`.read: auth != null`** — any signed-in device may read a room. Joiners must
    read it to check status before joining, and clients read `net/broadcast` to
    receive game state. The room code is the shared secret; no personal
    data lives here beyond chosen display names, and **no per-player secrets** —
    those are in `privateNet` (see above).
  - **`.write` (the long one)** — governs room-level fields (settings, status,
    teardown). **Create:** the writer must make themselves the host
    (`newData.host === auth.uid`). **Update/delete:** only the existing host may
    write, and an update can't change who the host is. Player-slot and `net`
    writes are granted by the deeper rules below.
  - **`host` / `gameId` / `status`** — type/length checks. `status` may only be
    `"waiting"` or `"playing"`.
  - **`players/$uid`** — a player may create/remove ONLY their own slot
    (join/leave/onDisconnect); the host may also remove any slot. Each slot must
    have a `name` (≤24 chars). No one can write someone else's slot.
  - **`net/broadcast`** — host → everyone. Only the host may write. `payload` is a
    string ≤500 KB (a `seq` counter rides alongside; both are fine).
  - **`net/toHost`** — client → host queue. Only a device that is actually a
    player in this room may push; the host drains the queue.
    - **`sender`** — must equal `auth.uid`. This is load-bearing: the host hands
      `sender` to every turn-ownership check (LastCard, Rummy, Poker, Go Fish,
      Who Am I?) as the authoritative player identity. It used to be validated
      only as "a string ≤128 chars", so a client could set another player's uid
      and act as them — playing their cards, folding their hand, submitting
      their secret (fixed 2026-08-02).
- **`privateNet/$code`**
  - **`.write`** — only the room's host may write any player's private slot.
  - **`$uid/.read: $uid === auth.uid`** — a player may read only their own slot.
    No `.read` is granted at `privateNet` or `privateNet/$code`, because a
    truthy read at either would cascade past this rule and re-open the hole.
  - **`$uid/$type/payload`** — string ≤500 KB, same as broadcast.

## Note on the room code
Reads are gated by `auth != null` **and** knowing the code. `CODE_LENGTH` in
`game/onlineRoom.js` was **lengthened from 4 to 6 chars on 2026-08-12**
(32^6 ≈ 1.07 billion combinations, vs the old ~1M) specifically so brute-forcing
every possible code — and reading every open room's display names + public game
state without ever being told a code — stops being practical. Per-player secrets
were never exposed this way (see `privateNet` above); this closes the remaining
"snoop on a live room" gap. Pure JS, no rules change, no rebuild.

Worth knowing: `google-services.json` is committed and contains a public Firebase
API key. That's normal for an Android Firebase config, but combined with open
anonymous auth it means the RTDB REST API is reachable without the app at all —
the code length is now the actual gate, which is why it needed lengthening.

## Cleanup
There is no server component, so there is **no global TTL sweep** — listing rooms
would require a read grant on the `rooms` node, which would let anyone enumerate
every live room code. Instead each host records the code it created
(`game/roomCleanup.js`), clears it on a clean exit, and sweeps its own leftover
room on next launch. Rooms abandoned by a host who never reopens the app still
linger; collecting those genuinely needs a Cloud Function.

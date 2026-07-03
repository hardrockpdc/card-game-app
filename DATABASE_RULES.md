# Realtime Database security rules — explained

The rules live in [`database.rules.json`](database.rules.json). That file is
kept **comment-free on purpose**: the Firebase console's Rules editor rejects
anything but a single top-level `rules` key (JSON has no real comments, and the
`"//"` comment-keys people fake break the console paste with *"Line 2: Expected
'rules' property."*). This doc holds the explanation instead.

## What Firebase stores
Only `rooms/*` — online lobbies and the in-game message relay. **Coins, profile,
stats and achievements are LOCAL to each device** (AsyncStorage) and never touch
Firebase. Auth is anonymous (see `game/firebase.js`), so `auth != null` mainly
ties every write to a stable uid, which powers the host/player ownership checks.

## How to deploy
- **Console:** Realtime Database → **Rules** tab → paste the whole
  `database.rules.json` → **Publish**.
- **CLI:** `firebase deploy --only database` (`firebase.json` points at the file).

## Rule-by-rule
- **`.read: false` / `.write: false` (root)** — default deny. Nothing is readable
  or writable unless a deeper rule re-grants it. Rules only ADD access down the tree.
- **`rooms/$code`**
  - **`.read: auth != null`** — any signed-in device may read a room. Joiners must
    read it to check status before joining, and clients read `net/*` to receive
    game state. The 4-char room code is the shared secret; no personal data lives
    here beyond chosen display names.
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
  - **`net/private/$uid`** — host → one client. Only the host may write.
  - **`net/toHost`** — client → host queue. Only a device that is actually a
    player in this room may push; the host drains the queue.

## Note on the room code
Reads are gated by `auth != null` **and** knowing the 4-character code. That's the
intended design (code = shared secret), but 4 chars is low-entropy — someone could
brute-force codes to read a room's display names + game state. Low risk for a
family card game; lengthen the code later if you ever want to harden this.

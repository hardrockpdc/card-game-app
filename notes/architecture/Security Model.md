---
verified: 2026-08-18
---

# Security model

### Coin Wallet (local only, no encryption)

`game/wallet.js` stores the coin balance and lifetime earnings in plain `AsyncStorage`
(JSON, no encryption). A user with a rooted Android device could manually edit the
stored value and give themselves an arbitrary coin balance.

**Why this is acceptable today:**

- Coins are purely local — there is no server, no leaderboard, and no way for one
  player's coin total to affect another player's experience.
- Cheating your own coin balance in a local card game has zero impact on anyone else.
- **Ranks** (`game/ranks.js`) and **achievements** (`game/achievements.js`) are derived
  from local lifetime earnings / local stats and are shown only to yourself — they do
  NOT compare totals across players, so the leaderboard caveat below isn't triggered
  yet. (Rank next to names in the online lobby is a deferred idea; if built, it'd
  expose a tamperable local number to others.)

**What must change before adding a leaderboard:** this MUST be addressed before
shipping any feature that compares coin/rank totals across players. Two viable paths:

1. **Signed/encrypted local storage** — e.g. `react-native-encrypted-storage`. Harder
   to tamper with, but still possible on rooted devices.
2. **Server-validated transactions** — move coin earning/spending to a backend that
   validates each transaction. Correct but adds significant infrastructure.

Path 2 is the right long-term answer. Don't ship a leaderboard without it.

### Profile & Save Data

Same situation — `profile.js` and `gameSaves.js` both use plain AsyncStorage. Profile
data (name, avatar, stats) and save game state are all readable and editable on a
rooted device. Acceptable for local-only play.

### Network Security

**This section previously described a local-only network model that predates online
multiplayer and was stale — corrected here.**

Two transports exist today, picked by `game/GameNetwork.js`'s `setNetworkMode`:

- **Local:** TCP (port 7777) + UDP discovery (port 7778), phone-to-phone only, no
  internet involved. No data ever leaves the LAN. Permissions: `NEARBY_WIFI_DEVICES` /
  `ACCESS_WIFI_STATE` (Android), `NSLocalNetworkUsageDescription` (iOS, unused since
  distribution is Android-only — see CLAUDE.md §2.3 on why the code stays anyway).
- **Online (added 2026-06):** Firebase Realtime Database, room-code based. Auth is
  anonymous (`game/firebase.js`). Two top-level paths: `rooms/*` (public lobby state,
  readable by any signed-in device — the room code is the actual secret) and
  `privateNet/*` (per-player private state, e.g. hole cards — readable only by
  `$uid === auth.uid`). Full rule-by-rule breakdown in [[Database Rules]]
  (`notes/specs/Database Rules.md`).
  - A 2026-08-02 audit found and fixed two critical holes: private hands were
    readable by every player in a room (moved from under `rooms/<code>` to the
    separate `privateNet/<code>/<uid>` — read rules cascade downward and can't be
    revoked by a descendant, so this move was structurally necessary, not
    cosmetic), and `net/toHost/sender` was validated as any string, letting a
    client impersonate another player in every turn check (now pinned to
    `auth.uid`).
  - **Republished in the Firebase console on 2026-08-18 (reported by Pedro),
    not yet functionally confirmed.** The console is the only witness to what the
    live rules say — nothing in this repo can read them back — so treat these two
    fixes as live only once the 2-device online retest passes (deal a poker hand,
    confirm it reaches the right player and nobody else's is visible; a bad deploy
    breaks hands specifically now that they live under `privateNet/*`). The
    committed file was checked on 2026-08-18 and is paste-clean for the console
    (single top-level `rules` key, no comment keys). See [[LAUNCH-3]], still the
    single highest-priority open item — now because the shipped build is stale,
    not because the rules are unpublished.
  - Room codes were lengthened from 4 to 6 characters (2026-08-12) specifically to
    stop brute-forcing every possible code and snooping on live rooms without ever
    being told a code.
  - `google-services.json` is committed and contains a public Firebase API key —
    normal for Android Firebase config, but combined with open anonymous auth it
    means the RTDB REST API is reachable without the app at all, which is why the
    room-code length is the actual gate.

No user accounts beyond anonymous Firebase auth. No analytics. No ads.

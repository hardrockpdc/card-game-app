# 📋 Project Summary — Card Night

## 🎯 The Vision

A cross-platform React Native mobile app for playing card games with friends and family. Works **completely offline** via local WiFi/hotspot (phones connect directly to each other — no internet needed). Each player uses their own phone (private hand). Up to 8+ players per game.

**Important principle:** Offline play is core to the app, not a nice-to-have. Airplane / no-WiFi scenarios covered via phone hotspot.

## 👤 About You (Pedro)

- Total beginner — never coded before this project
- Windows PC, Android phone (plus second Android for multiplayer testing)
- Email: hardrockpdc@gmail.com
- GitHub: [hardrockpdc/card-game-app](https://github.com/hardrockpdc/card-game-app) (private)
- Expo account: created, logged in via terminal
- Prefers: tappable button questions (not typing), simple language, step-by-step, explanations of what each piece does
- Workflow: planning/spec'ing in Claude.ai chat + building in Claude Code

## 🗺️ Full Roadmap

- ✅ **Phase 1:** Setup (Node, VS Code, Git, Expo Go), project created, Hello World on phone
- ✅ **Phase 2:** All screens built, navigation working
- ✅ **Phase 3:** Single-player Blackjack
- ✅ **Phase 4 Step 1:** `react-native-tcp-socket` + `expo-network` installed, GameNetwork.js created
- ✅ **Phase 4 Step 2:** HostSetupScreen — TCP server, device IP shown, player counter
- ✅ **Phase 4 Step 3:** JoinScreen — UDP auto-discovery, no IP typing needed
- ✅ **Phase 4 Step 4:** LobbyScreen — live player list, game selector, START_GAME broadcast
- ✅ **Phase 4 Step 5:** Multiplayer Blackjack
- ✅ **Phase 4.5:** Multiplayer Go Fish + Texas Hold'em Poker
- ✅ **Phase 4.8:** Conquián complete — Initial Card Pass, Priority Chain, Borrowing, multiplayer
- ✅ **Phase 4.9:** App renamed from "Card Games" to "Card Night"
- ✅ **Wild Round Phase A:** Card data + pure game logic + tests
- ✅ **Wild Round Phase B:** Single-player UI with AI opponents
- ✅ **Wild Round Phase C:** Full multiplayer with host/client networking ← **CURRENT**
- 🔜 **Wild Round Phase D:** Admin Card Editor (was built, reverted — needs rebuilding)
- 🔜 **Wild Round Phase E:** Full card content (100 prompts + 300 answers, was built, reverted)
- 🔜 **Phase 5: Polish** ⏸️ paused until better PC available
  - Visual polish, animations, sounds
  - Manual hand-sort with `react-native-draggable-flatlist`
  - Themed card packs
  - Multi-language (English + Spanish)
- 🔜 **Phase 6: Publish** — Google Play + App Store

## 🛠️ Tech Stack

- **Framework:** React Native + Expo (custom dev build, NOT Expo Go)
- **Navigation:** React Navigation (native-stack)
- **Networking:** `react-native-tcp-socket` (port 7777) + `react-native-udp` (port 7778 discovery) + `expo-network`
- **Build system:** EAS Build (Expo's cloud build service)
- **Source control:** Git + GitHub (https://github.com/hardrockpdc/card-game-app)
- **Package ID:** `com.pedro.cardgameapp`
- **App display name:** Card Night

## 📂 Current Project Structure

```
card-game-app/
├── assets/
├── components/
│   └── Card.js                    (reusable playing card visual)
├── game/
│   ├── deck.js                    (createDeck, shuffleDeck, calculateHandValue)
│   ├── conquian.js                (Conquián game logic — pure functions)
│   ├── wildround.js               (Wild Round game logic — pure functions)
│   ├── wildroundCards.json        (10 prompts + 36 answers — Phase A placeholder)
│   └── GameNetwork.js             (TCP server/client + UDP discovery)
├── screens/
│   ├── HomeScreen.js              (main menu)
│   ├── HostSetupScreen.js         (name input, starts TCP server, shows IP)
│   ├── JoinScreen.js              (UDP auto-discovery list, tap to join)
│   ├── LobbyScreen.js             (player list, game selector, Start Game)
│   ├── GameScreen.js              (single-player Blackjack)
│   ├── MultiplayerGameScreen.js   (multiplayer Blackjack)
│   ├── GoFishGameScreen.js        (multiplayer Go Fish)
│   ├── PokerGameScreen.js         (Texas Hold'em Poker)
│   ├── ConquianGameScreen.js      (Conquián — single + multiplayer)
│   ├── WildRoundGameScreen.js     (Wild Round — single + multiplayer)
│   ├── SinglePlayerSetupScreen.js (single-player game + AI picker)
│   ├── HowToPlayScreen.js         (rules reference screen)
│   ├── ResultsScreen.js           (placeholder)
│   └── SettingsScreen.js          (placeholder — will hold hidden Phase D card editor trigger)
├── App.js                         (navigation stack — all screens registered)
├── app.json                       (bundle ID: com.pedro.cardgameapp, EAS projectId)
├── eas.json                       (development/preview/production build profiles)
├── package.json
├── PROJECT_NOTES.md               (this file)
├── CONQUIAN_SPEC.md               (Conquián complete spec)
└── WILDROUND_SPEC.md              (Wild Round complete spec)
```

## 📦 Dependencies

```
@react-navigation/native: ^7.2.2
@react-navigation/native-stack: ^7.14.11
expo: ~54.0.33
expo-dev-client: ~6.0.20
expo-network: ~8.0.8
expo-status-bar: ~3.0.9
react: 19.1.0
react-native: 0.81.5
react-native-draggable-flatlist: ^4.0.3   (reserved for planned Wild Round hand-sort polish)
react-native-safe-area-context: ~5.6.0
react-native-screens: ~4.16.0
react-native-tcp-socket: ^6.4.1
react-native-udp: ^4.1.7
```

## 🎨 Visual Style

- Dark navy background (`#1a1a2e`)
- Red/pink accent (`#e94560`) for primary buttons
- Dark green card table (`#0d5c2e`) on game screens
- White cards with red hearts/diamonds, black spades/clubs
- Hidden card shown as red back with 🂠 symbol

## 📍 Where We Are Right Now

**Wild Round Phase C complete — full multiplayer working.** Project is at a clean, stable state after a recent revert (Phase D and E were built then reverted due to issues with another AI tool). Project notes and all spec files are current.

**Card Night currently includes 5 working games:**

- Blackjack (single + multiplayer)
- Go Fish (multiplayer)
- Texas Hold'em Poker (multiplayer)
- Conquián (single + multiplayer, with AI Easy/Medium/Hard)
- Wild Round (single + multiplayer, 3-8 players, party-style)

**EAS build status:** Current build on both phones works. No new native packages have been added since last build, so `npx expo start --dev-client` is sufficient for development.

**Removed games (cleaned up):** Crazy Eights, War, Snap, Rummy. These were intentionally cut to keep the lineup focused.

## 🔮 Next Steps When We Resume

1. **Rebuild Wild Round Phase D** — admin card editor with AsyncStorage overlay (hidden access via tapping version number 5× in Settings). Adding `@react-native-async-storage/async-storage` will require a NEW EAS build because it's a native module.
2. **Rebuild Wild Round Phase E** — bulk-add original CC0 + Pedro-written content to reach 100 prompts + 300 answers
3. **Phase 5: Polish** (paused until on better PC) — animations, sounds, manual hand-sort, multi-language EN+ES
4. **Phase 6: Publish** — Google Play + App Store submission

## 💡 Important Reminders

### Daily workflow

- Start dev server with: `npx expo start --dev-client` (NOT plain `npx expo start`)
- Both phones must be on same WiFi or one phone's hotspot
- Using hotspot: host gets `192.168.4.1`, joining phones get `192.168.4.X`
- School/work WiFi often uses `10.27.27.x` subnet — both work as long as phones share subnet

### Save habit (do this between every meaningful change)

```
git add . && git commit -m "what I just did" && git push
```

### When to do a NEW EAS build

Only when adding a NEW native package. JS-only changes don't need a rebuild.

- `react-native-tcp-socket` (already in current build)
- `react-native-udp` (already in current build)
- `react-native-draggable-flatlist` (planned, NOT yet in build — will trigger rebuild when used)
- `@react-native-async-storage/async-storage` (planned for Phase D — will trigger rebuild when added)

### Coding patterns established

- Game logic files (`game/*.js`): pure functions only, no React, easy to test
- Multiplayer game screens use `fullRef` / `applyState` / `toPublic` / `PRIVATE_HAND` pattern
- Host runs all game logic, broadcasts public state, sends private hands to each client
- Clients send ACTION messages to host

## 🔧 How GameNetwork.js Works

**Host side:**

- `startServer()` — opens TCP port 7777
- `setServerListeners({ onClientJoined, onClientLeft, onMessage })` — any screen can take over
- `broadcastToClients(message)` — sends JSON to ALL connected players
- `sendToClient(clientId, message)` — sends to one specific player
- `stopServer()` — closes port, kicks everyone

**Client side:**

- `connectToHost(ip, callbacks)` — connects to host TCP server
- `setClientListeners({ onMessage, onDisconnected })` — any screen can take over
- `sendToHost(message)` — sends JSON to host
- `disconnectFromHost()` — disconnects cleanly

**UDP Discovery:**

- `startBroadcasting(hostName, hostIp)` — host sends UDP packet every 2s on port 7778
- `stopBroadcasting()` — stops sending
- `startDiscovery(onGameFound)` — client listens on port 7778, fires callback with { name, ip }
- `stopDiscovery()` — stops listening

## 🎮 Multiplayer Game Screen Pattern (used by all multiplayer games)

- `fullRef` — host only, holds complete state including private hands
- `applyState(newState)` — updates ref + React state + broadcasts to all clients
- `toPublic(state)` — strips private data before broadcasting
- Clients receive `GAME_STATE` (public) + `PRIVATE_HAND` (their cards only)
- Host finds self by `p.id === 'host'`; clients find self by `p.name === myName`

### Game-specific notes

**Blackjack:** Standard rules, dealer hits to 16 stands on 17, blackjack pays normal. Multiplayer: each player vs dealer, dealer plays once after all players act.

**Go Fish:** Private hands; two-step ask (tap card in hand to pick rank, tap player to pick target, then Ask button). Extra turn if target had the rank OR drawn card matches asked rank. Books (4-of-a-kind) auto-complete; 13 books = game over. 7 cards each for 2 players, 5 each for 3+.

**Poker (Texas Hold'em):** Private hole cards; blinds 10/20; starting chips 500. Streets: preflop → flop → turn → river → showdown. Actions: Fold, Check, Call, Raise (presets +min, +2× min, pot, all-in). `playersToAct` queue rebuilt on raise. All-in auto-runout if no one can act. Hand ranking: Royal Flush down to High Card. Pot split on tie. Dealer rotates each hand.

**Conquián:** Mexican rummy. 40-card Mexican deck (A,2-7,J,Q,K). 7-J-Q-K is a valid run sequence. Initial Card Pass at start of every game (simultaneous blind clockwise pass). Priority Chain mechanic for discards/passes. Borrowing rule (rearrange own melds when taking a card). Win at hand_size+1 melded cards. Tie when stock empty. AI difficulty: Easy/Medium/Hard.

**Wild Round:** Party game (CAH-style with original/CC0 content only). 3-8 players. 10-card hand of answers. Judge rotates each round. Judge can skip Prompt 1 once per round. No timer. Submissions anonymous during judging, revealed after. Tone toggle (Family / Mature, host picks; Mature includes both). First to 10 points wins. Currently using placeholder cards (10/36) — Phase E adds full content.

## 📜 Active Spec Files

- `CONQUIAN_SPEC.md` — Conquián full spec (built ✅)
- `WILDROUND_SPEC.md` — Wild Round full spec (Phases A-C built ✅, Phases D-E to redo)

## 🚫 Decisions Made

- **No Bluetooth multiplayer** — using WiFi/hotspot only (Bluetooth in Expo doesn't work reliably)
- **No Firebase** — staying truly offline-first, no internet dependency
- **No 5-6 player Conquián** — 2-4 players only in v1, 2-deck mode dropped from v1
- **No CAH official cards** — their NC license blocks future monetization; using only CC0 + original content
- **No card editor for non-admin users in v1** — admin-only (Pedro) for content control
- **Removed games:** Crazy Eights, War, Snap, Rummy

## 🐛 Known Issues / Things to Watch

- Wild Round has only placeholder cards (10 prompts / 36 answers). A 3-player game needs 30 cards just to deal hands, leaving only 6 for replenishment. Playable for testing but thin. Phase E fixes this.
- No card editor at this state (Phase D reverted). Cards can only be changed by editing `game/wildroundCards.json` directly.
- `react-native-draggable-flatlist` is installed but not yet used — kept for planned hand-sort polish.
- `SettingsScreen.js` is a placeholder ("Coming soon!"). The hidden card editor trigger will be added back in Phase D.
- Wild Round requires 3 players minimum (enforced in Lobby with disabled Start button + explanation).

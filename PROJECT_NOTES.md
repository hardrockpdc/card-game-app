📋 Project Summary — Card Game App

🎯 The Vision
A cross-platform React Native mobile app for playing card games with friends and family. Works completely offline via local WiFi/hotspot (phones connect directly to each other — no internet needed). Each player uses their own phone (private hand). Up to 8+ players per game.
Important principle: Offline play is core to the app, not a nice-to-have. Airplane / no-WiFi scenarios covered via phone hotspot.

👤 About You (Pedro)

Total beginner — never coded before
Windows PC, Android phone (plus second Android for multiplayer testing)
Email: hardrockpdc@gmail.com
GitHub: yes (free, linked to above email)
Expo account: created, logged in via terminal
Prefers: tappable button questions (not typing), simple language, step-by-step, explanations of what each piece does

🗺️ Full Roadmap

✅ Phase 1: Install everything, project created, "Hello World" on phone
✅ Phase 2: All 7 screens built, navigation working (Home, HostSetup, Join, Lobby, Game, Results, Settings)
✅ Phase 3: Single-player Blackjack fully working (deal, hit, stand, bust, dealer AI, win/lose/push, play again)
✅ Phase 4 Step 1: react-native-tcp-socket + expo-network installed, GameNetwork.js created
✅ Phase 4 Step 2: HostSetupScreen fully working — starts TCP server, shows device IP, counts connected players
✅ Phase 4 Step 3: JoinScreen fully working — auto-discovery via UDP, no IP typing needed
✅ Phase 4 Step 4: LobbyScreen fully working — live player list, game selector, START_GAME broadcasts to all
✅ Phase 4 Step 5: Multiplayer Blackjack working — host runs game logic, all phones sync, Play Again redeals
✅ Phase 4.6: Multi-game support — Lobby has game selector; Crazy 8s + War fully playable
✅ Phase 4.7: All remaining card games built — Go Fish, Rummy, Snap, Texas Hold'em Poker
🔜 Phase 5: Party card game (Cards Against Humanity-style — mix of original and open-source content)
🔜 Phase 6: Polish (sounds, animations, nicer card designs, in-app "how to host offline" helper)
🔜 Phase 7: Publish to Google Play and App Store

🛠️ Tech Stack Decisions

Framework: React Native + Expo (development build now, not Expo Go)
Navigation: React Navigation (native-stack)
Networking: react-native-tcp-socket + expo-network (TCP port 7777) + react-native-udp (UDP port 7778 for discovery)
Build system: EAS Build (Expo's cloud build service)
Source control: Git (local only so far, not yet pushed to GitHub)
Package ID: com.pedro.cardgameapp

📂 Current Project Structure
card-game-app/
├── assets/
├── components/
│   └── Card.js                    (reusable playing card visual)
├── game/
│   ├── deck.js                    (createDeck, shuffleDeck, calculateHandValue)
│   └── GameNetwork.js             (TCP server/client + UDP discovery)
├── screens/
│   ├── HomeScreen.js              (main menu)
│   ├── HostSetupScreen.js         (name input, starts TCP server, shows IP)
│   ├── JoinScreen.js              (UDP auto-discovery list, tap to join)
│   ├── LobbyScreen.js             (player list, game selector, Start Game)
│   ├── GameScreen.js              (single-player Blackjack)
│   ├── MultiplayerGameScreen.js   (multiplayer Blackjack ✅)
│   ├── CrazyEightsGameScreen.js   (multiplayer Crazy 8s ✅)
│   ├── WarGameScreen.js           (multiplayer War ✅)
│   ├── GoFishGameScreen.js        (multiplayer Go Fish ✅)
│   ├── RummyGameScreen.js         (multiplayer Rummy ✅)
│   ├── SnapGameScreen.js          (multiplayer Snap ✅)
│   ├── PokerGameScreen.js         (Texas Hold'em Poker ✅)
│   ├── ResultsScreen.js           (placeholder)
│   └── SettingsScreen.js          (placeholder)
├── App.js                         (navigation — all screens wired)
├── app.json                       (com.pedro.cardgameapp, EAS projectId)
├── eas.json                       (development/preview/production profiles)
└── package.json

🎨 Visual Style Established

Dark navy background (#1a1a2e)
Red/pink accent (#e94560) for primary buttons
Dark green card table (#0d5c2e) on Blackjack/Crazy 8s screens
White cards with red hearts/diamonds, black spades/clubs
Hidden card shown as red back with 🂠 symbol

### 📍 Where We Are Right Now

**Phase 4.7 complete — all 7 multiplayer games built and confirmed working.** Full flow:
- Host taps "Host a Game" → enters name → goes to Lobby
- Lobby broadcasts UDP every 2s so clients can find the game automatically
- Joining player taps "Join a Game" → game appears in list → taps Join → lands in Lobby
- Host selects a game from the chip row (Blackjack, Crazy 8s, War, Go Fish, Rummy, Snap, Poker)
- Host taps Start Game → all phones navigate to the correct game screen
- All 7 games are fully implemented ✅

**Multiplayer networking model:**
- Host runs ALL game logic
- After every action, host broadcasts public state + sends each client their private hand (Crazy 8s)
- Clients send ACTION messages back to host
- `stateRef` / `fullRef` pattern avoids stale closures in network callbacks

**UDP discovery:**
- Host phone creates a hotspot OR both phones on same WiFi
- `192.168.4.X` = Android hotspot subnet (host is `.1`, clients get `.2`, `.3`, etc.)
- `10.27.27.X` = school/work WiFi (use this when available instead of hotspot)
- Both work — phones just need to be on the same subnet

**⚠️ EAS build status:**
- A new EAS build was required when `react-native-udp` was added (native package)
- That build is complete and installed on both phones
- All changes since then are pure JS — `npx expo start --dev-client` is enough

### 🔮 Next Steps When We Resume

1. **Phase 5: Party card game** — Cards Against Humanity-style (mix of original and open-source content)
2. **Phase 6: Polish** — sounds, animations, nicer card designs, in-app "how to host offline" helper
3. **Phase 7: Publish** — Google Play and App Store

### 💡 Important Reminders

- Start dev server with: `npx expo start --dev-client` (NOT plain `npx expo start`)
- Both phones must be on same WiFi or one phone's hotspot
- Using hotspot: host phone gets `192.168.4.1`, joining phones get `192.168.4.X`
- `react-native-udp` uses `TextEncoder` not `Buffer` (Buffer doesn't exist in React Native)
- Game logic files: pure functions only — no React, easy to reason about
- Pedro is a beginner — explain new concepts clearly

### 🔧 How GameNetwork.js Works

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

### 🔧 How each multiplayer game screen works

**Pattern (same for all games):**
- `fullRef` — host only, holds complete state including private hands
- `applyState(newState)` — updates ref + React state + broadcasts to all clients
- `toPublic(state)` — strips private data before broadcasting
- Clients receive `GAME_STATE` (public) + `PRIVATE_HAND` (their cards only)
- Host finds self by `p.id === 'host'`; clients find self by `p.name === myName`

**Crazy 8s specifics:**
- Match discard pile by suit OR rank; 8s always playable (then choose suit)
- Private hands: host sends `PRIVATE_HAND` to each client after every action
- Phases: 'playing' → 'choosingSuit' (after 8 played) → back to 'playing'
- Cards dealt: 7 each for 2 players, 5 each for 3+ players

**War specifics:**
- No private info — everyone sees same cards (simple broadcast)
- No player choices — host (or any player) taps "Flip Cards" to advance
- Highest card wins the round, most points after all rounds wins

**Go Fish specifics:**
- Private hands: host sends `PRIVATE_HAND` to each client
- Two-step ask: tap a card in hand (picks rank) + tap a player (picks target) → Ask button
- Extra turn if target had the rank OR if drawn card matches asked rank
- Books (4-of-a-kind) auto-complete; 13 total books = game over
- Cards dealt: 7 each for 2 players, 5 each for 3+ players

**Rummy specifics:**
- Private hands: host sends `PRIVATE_HAND` to each client
- Turn phases: 'draw' (must draw from deck or discard pile) → 'play' (meld/discard)
- Melds (sets of 3–4 same rank, or runs of 3+ same suit consecutive rank) are public on table
- Discard card discards it and ends your turn; you must have drawn first
- Game ends when any player empties their hand

**Snap specifics:**
- Shared deck (52 cards), turn-based flipping — current player taps "Flip a Card"
- If top two center cards match rank → SNAP WINDOW opens (background turns red)
- Any player taps SNAP button to win those cards (as points) — first one wins
- 5-second timeout if nobody snaps → missed, turn advances
- Game ends when deck is empty; most snaps wins

**Poker (Texas Hold'em) specifics:**
- Private hole cards until showdown; `PRIVATE_HAND` pattern
- Blinds: 10 (small) / 20 (big); starting chips: 500
- Streets: preflop → flop (3 cards) → turn (1) → river (1) → showdown
- Actions: Fold, Check (if no bet), Call, Raise (presets: +min, +2×min, pot, all-in)
- `playersToAct` queue — raise rebuilds queue for all active players after raiser
- All-in auto-runout: if no one can act, remaining streets deal automatically
- Hand ranking: Royal Flush → Straight Flush → Four of a Kind → Full House → Flush → Straight → Three of a Kind → Two Pair → Pair → High Card
- Pot split on exact tie; dealer rotates each hand

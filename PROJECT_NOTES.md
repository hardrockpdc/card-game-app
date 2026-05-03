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

- ✅ **Phase 1:** Setup (Node, VS Code, Git, Expo), project created, Hello World on phone
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
- ✅ **Wild Round Phase C:** Full multiplayer with host/client networking
- ✅ **Wild Round Phase E:** Full card content (100 prompts + 300 answers)
- ✅ **Last Card Phase C:** Full single-player + multiplayer networking
- ✅ **Update Phase 1:** HomeScreen restructured — three primary buttons (Single Player, Multiplayer, Profile); floating avatar modal removed
- ✅ **Update Phase 2:** MultiplayerMenuScreen added — Host Online / Join Online (Coming Soon, disabled), Host Local / Join Local (functional)
- ✅ **Update Phase 3:** Profile system — `game/profile.js`, `screens/ProfileScreen.js`, 20 emoji placeholder avatars, photo upload + crop (expo-image-picker + expo-image-manipulator + AsyncStorage), first-launch onboarding flow
- ✅ **Update Phase 4:** Card theme moved to Profile and persisted via AsyncStorage; SettingsScreen is now a plain placeholder
- ✅ **Update Phase 5:** Wild Round removed from Single Player carousel only (still works in multiplayer Lobby)
- ✅ **Update Phase 6:** `game/responsive.js` created; Card.js updated to scale with screen width; portrait locked in app.json
- ✅ **Update Phase 7:** Responsive sizing applied to all remaining screens (all `scale()` / `scaleFont()` calls)
- ✅ **Update Phase 8:** Blackjack split added to GameScreen.js (single-player) and MultiplayerGameScreen.js (multiplayer)
- 🔜 **Phase 5: Visual Theme Project (PAUSED)** ⏸️ paused until better PC available
  - Plan: Each game gets its own distinct theme (Blackjack=casino, Poker=premium black, Wild Round=neon party, etc.)
  - Theme switching: User can pick between themes per game
  - Design ONE game's theme first (Blackjack)
  - Build theme system scaffolding
  - Redesign other 4 games
  - Add multiple swappable themes
  - Visual polish, animations, sounds
  - Manual hand-sort with `react-native-draggable-flatlist`
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
│   ├── lastCard.js                (Last Card game logic — pure functions)
│   ├── wildroundCards.json        (100 prompts + 300 answers — Phase E complete)
│   ├── GameNetwork.js             (TCP server/client + UDP discovery)
│   ├── profile.js                 (loadProfile, saveProfile, subscribeProfile, getDisplayName — AsyncStorage)
│   └── responsive.js              (scale(), scaleFont() — BASE_WIDTH 390, clamped factors)
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
│   ├── LastCardGameScreen.js     (Last Card — single + multiplayer)
│   ├── SinglePlayerSetupScreen.js (single-player game + AI picker; Wild Round removed from carousel)
│   ├── MultiplayerMenuScreen.js   (Host Online/Join Online = Coming Soon; Host Local/Join Local = functional)
│   ├── ProfileScreen.js           (name, avatar/photo picker, card theme link, stats placeholder)
│   ├── HowToPlayScreen.js         (rules reference screen)
│   ├── ResultsScreen.js           (placeholder)
│   └── SettingsScreen.js          (placeholder — "More settings coming soon")
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
@react-native-async-storage/async-storage  (profile persistence — added Phase 3, requires EAS build)
@react-navigation/native: ^7.2.2
@react-navigation/native-stack: ^7.14.11
expo: ~54.0.33
expo-dev-client: ~6.0.20
expo-image-manipulator                     (photo crop to 1:1 — added Phase 3, Expo-native, no extra native module)
expo-image-picker                          (camera roll + camera access — added Phase 3, Expo-native)
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
- Cards use PNG image assets (see Card Themes below)
- Hidden/face-down card uses each theme's `card_back.png`

## 🃏 Card Themes

Theme switching is live — tap a theme in Profile → Card Theme and all open games update instantly. No restart needed. **Theme is now persisted via AsyncStorage** (saved as part of the profile) — survives app restarts. Theme picker moved from Settings to Profile in Update Phase 4.

| Theme ID | Label    | Asset folder              |
| -------- | -------- | ------------------------- |
| neon     | Neon     | assets/cards/             |
| cowboy   | Cowboy   | assets/cards_cowboy/      |
| girly    | Girly    | assets/card_images_girly/ |
| hp       | Hogwarts | assets/card_images_hp/    |
| jewel    | Jewel    | assets/card_images_jewel/ |

All folders use identical filenames: `{rank}_{suit}.png` (ranks: a 2–10 j q k, suits: spades hearts diamonds clubs) + `card_back.png`.

**Theme system files:**

- `game/cardTheme.js` — module singleton, 265 static requires (5 themes × 53 images), `setTheme`/`getTheme`/`subscribe`/`getCardImage`/`getCardBackImage`/`getThemePreviewImage`/`THEMES_LIST` exports
- `components/Card.js` — uses cardTheme.js, subscribes to live changes via `useEffect`
- `screens/CardThemeScreen.js` — full-screen swiper (FlatList pagingEnabled), Ace of Spades preview, dot indicators, "Use This Theme" button
- `screens/ProfileScreen.js` — "Card Theme" row links to `CardThemes` route
- `screens/SettingsScreen.js` — now a plain placeholder ("More settings coming soon"); Card Themes row removed

## 📐 Layout Conventions

- Use `SafeAreaProvider` at the app root.
- Use `SafeAreaView` from `react-native-safe-area-context`, not the deprecated React Native version.
- Make key screens responsive with `useWindowDimensions()`.
- Prefer `ScrollView` for screens that may overflow on smaller phones.
- Avoid absolute positioning for important buttons or navigation links unless there is a strong reason.

## 📍 Where We Are Right Now

**Update Phases 1–8 complete.** Project is at a clean, stable state.

**What was added in this update session:**
- Profile system (name, avatar, photo upload+crop, card theme link, stats placeholder) — persists via AsyncStorage
- MultiplayerMenuScreen with Coming Soon online buttons
- Name fields removed from HostSetupScreen and JoinScreen (reads from profile)
- Card theme persisted via profile; Settings reduced to placeholder
- Wild Round removed from Single Player carousel (still fully functional in multiplayer)
- `game/responsive.js` with `scale()` / `scaleFont()` helpers; all screens now use responsive sizing
- Blackjack split: two same-rank cards dealt → Split button appears; play hand 0 then hand 1; dealer plays once against both; works in single-player and multiplayer

**Card Night currently includes 6 working games:**

- Blackjack (single + multiplayer)
- Go Fish (single + multiplayer, with AI Easy/Medium/Hard; hand auto-sorts by rank)
- Texas Hold'em Poker (single + multiplayer, with AI Easy/Medium/Hard)
- Conquián (single + multiplayer, with AI Easy/Medium/Hard)
- Wild Round (single + multiplayer, 3-8 players, party-style)
- Last Card (single + multiplayer, 2-8 players, AI single difficulty)

**Visual assets update:** Cards now use neon image assets in `assets/cards/` (replaced procedural drawing).

**EAS build status:** A new EAS build was required for Update Phase 3 (added `@react-native-async-storage/async-storage`). `expo-image-picker` and `expo-image-manipulator` are Expo-native and didn't require a separate build. Current build includes all packages through Phase 8.

**Removed games (cleaned up):** Crazy Eights, War, Snap, Rummy. These were intentionally cut to keep the lineup focused.

## 🔮 Next Steps When We Resume

1. **Update Phase 9: Poker Variants** — Omaha, Five Card Draw, Seven Card Stud added alongside existing Texas Hold'em; scroll-wheel variant picker; single-player + multiplayer
2. **Update Phase 10: Solitaire** — Klondike, Spider, FreeCell, Pyramid, TriPeaks; single-player only; scroll-wheel picker
3. **Update Phase 11: Rummy** — Gin Rummy, Rummy 500, Indian Rummy, Canasta; single + multiplayer
4. **Update Phase 12: Variant Pickers Polish** — shared VariantPicker component
5. **Update Phase 13: Stats Tracking** — per-game stats in Profile
6. **Phase 5: Visual Theme Project** (paused until on better PC)
7. **Phase 6: Publish** — Google Play + App Store

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
- `@react-native-async-storage/async-storage` (planned for the card editor — will trigger rebuild when added)

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

**Blackjack:** Standard rules, dealer hits to 16 stands on 17, blackjack pays normal. **Split supported** (two same-rank cards → Split button; two hands played in sequence; dealer plays once against both; works single-player and multiplayer). Multiplayer: each player vs dealer, dealer plays once after all players act.

**Go Fish:** Private hands; two-step ask (tap card in hand to pick rank, tap player to pick target, then Ask button). Extra turn if target had the rank OR drawn card matches asked rank. Books (4-of-a-kind) auto-complete; 13 books = game over. 7 cards each for 2 players, 5 each for 3+. Hand auto-sorts by rank (A-low). AI: Easy (random), Medium (asks for rank it has most of + short memory), Hard (full-game history tracking). Works in single-player and multiplayer lobby.

**Poker (Texas Hold'em):** Private hole cards; blinds 10/20; starting chips 500. Streets: preflop → flop → turn → river → showdown. Actions: Fold, Check, Call, Raise (presets +min, +2× min, pot, all-in). `playersToAct` queue rebuilt on raise. All-in auto-runout if no one can act. Hand ranking: Royal Flush down to High Card. Pot split on tie. Dealer rotates each hand. AI: Easy (loose, rarely folds), Medium (evaluates hand strength, by-the-book), Hard (tight + occasional bluffs on dry boards). Works in single-player and multiplayer lobby.

**Conquián:** Mexican rummy. 40-card Mexican deck (A,2-7,J,Q,K). 7-J-Q-K is a valid run sequence. Initial Card Pass at start of every game (simultaneous blind clockwise pass). Priority Chain mechanic for discards/passes. Borrowing rule (rearrange own melds when taking a card). Win at hand_size+1 melded cards. Tie when stock empty. AI difficulty: Easy/Medium/Hard.

**Wild Round:** Party game (CAH-style with original/CC0 content only). 3-8 players. 10-card hand of answers. Judge rotates each round. Judge can skip Prompt 1 once per round. No timer. Submissions anonymous during judging, revealed after. Tone toggle (Family / Mature, host picks; Mature includes both). First to 10 points wins. Full card content is now complete.

## 📜 Active Spec Files

- `CONQUIAN_SPEC.md` — Conquián full spec (built ✅)
- `WILDROUND_SPEC.md` — Wild Round full spec (Phases A-E built ✅)
- `LASTCARD_SPEC.md` — Last Card full spec (single + multiplayer built ✅)

## 🚫 Decisions Made

- **No Bluetooth multiplayer** — using WiFi/hotspot only (Bluetooth in Expo doesn't work reliably)
- **No Firebase** — staying truly offline-first, no internet dependency
- **No 5-6 player Conquián** — 2-4 players only in v1, 2-deck mode dropped from v1
- **No CAH official cards** — their NC license blocks future monetization; using only CC0 + original content
- **No card editor for non-admin users in v1** — admin-only (Pedro) for content control
- **Removed games:** Crazy Eights, War, Snap, Rummy

## 🐛 Known Issues / Things to Watch

- `react-native-draggable-flatlist` is installed but not yet used — kept for planned hand-sort polish.
- `SettingsScreen.js` is intentionally a placeholder ("More settings coming soon"). Card Themes moved to Profile.
- Wild Round requires 3 players minimum (enforced in Lobby with disabled Start button + explanation).
- Profile photo avatars (avatar_01–avatar_20) are placeholder emoji circles. Real artwork to be swapped in later.
- Stats section in ProfileScreen is a "Coming soon" placeholder until Update Phase 13.

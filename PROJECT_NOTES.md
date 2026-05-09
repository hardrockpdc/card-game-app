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
- ✅ **Update Phase 9:** Poker variants added — Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud; tap-select picker; single-player + multiplayer support
- ✅ **Update Phase 10:** Solitaire complete — Klondike, Spider, FreeCell, Pyramid, TriPeaks; picker/routes added; gameplay verified
- ✅ **Update Phase 11:** Rummy complete — Gin Rummy, Rummy 500, Indian Rummy, Canasta; single + multiplayer; simple tap-select picker
- ✅ **Update Phase 12:** Variant pickers polished — Poker, Solitaire, and Rummy now share one tap-select picker component
- ✅ **Month 2 Polish:** Pre-publish UX + quality sweep (all JS-only items complete; two native items installed, awaiting EAS build)
  - **M4:** `game/logger.js` created; all `console.log`/`warn` silenced in production via `__DEV__` guard; GameNetwork, profile, wildround updated
  - **UX1:** HomeScreen no longer auto-redirects to Profile on mount; Single Player button disabled (with hint) until profile name is set
  - **UX6:** `components/Toast.js` + `useToast` hook — animated pill toasts for illegal-move feedback; wired into Rummy (4 moves) and Conquián
  - **UX3:** `components/QuitButton.js` — absolute-positioned ✕ Quit button added to all 9 game screens; multiplayer screens call `stopServer()`/`disconnectFromHost()` on quit; ScrollView-root screens wrapped in a `View` to host the overlay
  - **M5:** `scale()`/`scaleFont()` applied to all remaining StyleSheet numeric values in 6 screens (GameSetupScreen, ProfileScreen, MultiplayerMenuScreen, SolitaireVariantPickerScreen, RummyVariantPickerScreen, PokerVariantPickerScreen)
  - **M6:** `ResultsScreen.js` fully implemented (winner headline, scoreboard, Play Again + Back to Menu); WildRoundGameScreen wired to navigate there on game-over via `navigation.replace`
  - **M7:** Settings gear link removed from HomeScreen (SettingsScreen kept as placeholder but unlisted)
  - **L8:** MultiplayerMenuScreen subtitle + button labels updated — "Not available yet" / "coming in a future update" instead of "Coming Soon"
  - **UX5:** `expo-clipboard` installed; HostSetupScreen IP card is now tappable → copies IP, shows ✓ Copied! feedback (awaits EAS build)
  - **UX4:** `expo-av` installed; `game/sounds.js` preloads card_flip/card_deal/win/error sounds; wired into Blackjack (deal, hit, win) and Toast (error on any illegal move); silent WAV placeholders in `assets/sounds/` — replace with real audio files; `initSounds()` called from App.js (awaits EAS build)
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
│   └── sounds/                    (card_flip.wav, card_deal.wav, win.wav, error.wav — silent placeholders, replace with real audio)
├── components/
│   ├── Card.js                    (reusable playing card visual)
│   ├── VariantPicker.js           (shared tap-select picker UI)
│   ├── PokerVariantWheel.js       (simple tap-select poker variant picker UI)
│   ├── RummyVariantWheel.js       (simple tap-select rummy variant picker UI)
│   ├── Toast.js                   (animated pill toast + useToast hook — illegal move feedback + error sound)
│   └── QuitButton.js              (absolute-positioned ✕ Quit button — used by all 9 game screens)
├── game/
│   ├── deck.js                    (createDeck, shuffleDeck, calculateHandValue)
│   ├── ThemeContext.js            (React context for card theme — single listener, shared across all Cards)
│   ├── conquian.js                (Conquián game logic — pure functions)
│   ├── wildround.js               (Wild Round game logic — pure functions)
│   ├── lastCard.js                (Last Card game logic — pure functions)
│   ├── poker.js                  (Poker variant logic — Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud)
│   ├── solitaire.js               (Solitaire game logic — Klondike, Spider, FreeCell, Pyramid, TriPeaks)
│   ├── rummy.js                   (Rummy game logic — Gin Rummy, Rummy 500, Indian Rummy, Canasta)
│   ├── wildroundCards.json        (100 prompts + 300 answers — Phase E complete)
│   ├── GameNetwork.js             (TCP server/client + UDP discovery)
│   ├── logger.js                  (log/warn — no-ops in production builds via __DEV__)
│   ├── profile.js                 (loadProfile, saveProfile, subscribeProfile, getDisplayName — AsyncStorage)
│   ├── responsive.js              (scale(), scaleFont() — BASE_WIDTH 390, clamped factors)
│   └── sounds.js                  (initSounds/playSound — expo-av; preloads 4 sounds on app start; graceful no-op if unavailable)
├── screens/
│   ├── HomeScreen.js              (main menu)
│   ├── HostSetupScreen.js         (name from profile, starts TCP server, shows IP)
│   ├── JoinScreen.js              (UDP auto-discovery list, tap to join)
│   ├── LobbyScreen.js             (player list, game selector, Start Game)
│   ├── GameScreen.js              (single-player Blackjack)
│   ├── MultiplayerGameScreen.js   (multiplayer Blackjack)
│   ├── GoFishGameScreen.js        (multiplayer Go Fish)
│   ├── PokerGameScreen.js         (Poker variants: Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud)
│   ├── PokerVariantPickerScreen.js (tap-select poker variant picker)
│   ├── SolitaireVariantWheel.js   (simple tap-select solitaire variant picker UI)
│   ├── SolitaireVariantPickerScreen.js (tap-select solitaire variant picker)
│   ├── SolitaireGameScreen.js      (Solitaire — single-player only)
│   ├── ConquianGameScreen.js      (Conquián — single + multiplayer)
│   ├── WildRoundGameScreen.js     (Wild Round — single + multiplayer)
│   ├── LastCardGameScreen.js      (Last Card — single + multiplayer)
│   ├── SinglePlayerSetupScreen.js (single-player game + AI picker; Wild Round removed from carousel)
│   ├── MultiplayerMenuScreen.js   (Host Online/Join Online = Coming Soon; Host Local/Join Local = functional)
│   ├── RummyGameScreen.js         (Rummy — single + multiplayer)
│   ├── RummyVariantPickerScreen.js (tap-select Rummy variant picker)
│   ├── ProfileScreen.js           (name, avatar/photo picker, card theme link, stats placeholder)
│   ├── HowToPlayScreen.js         (rules reference screen)
│   ├── ResultsScreen.js           (real implementation — winner headline, scoreboard, Play Again / Back to Menu)
│   └── SettingsScreen.js          (placeholder — "More settings coming soon"; link removed from HomeScreen)
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
expo-av                                    (sound effects — added Month 2, requires EAS build)
expo-clipboard                             (tap-to-copy IP — added Month 2, requires EAS build)
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
- `game/ThemeContext.js` — React context wrapping `cardTheme.js`; provides `useTheme()` hook; single AppState subscriber shared across all Card instances (replaces per-Card `useEffect` subscribers)
- `components/Card.js` — uses `ThemeContext` via `useTheme()`; wrapped in `React.memo`; size calculations memoized with `useMemo`
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

**Update Phases 1–12 complete + Performance & Crash-Risk pass complete.**

### Performance & Crash-Risk Pass (5 fixes)

- ✅ **Fix #1:** Card PNGs resized 300×420 → 200×280 (indexed-color palette). Decoded RAM reduced from ~206 MB worst-case to ~92 MB. `scripts/compress-cards.js` added for future re-runs. `assets/_card_originals_backup/` added to .gitignore.
- ✅ **Fix #2:** `game/ThemeContext.js` created — single AppState listener for theme changes instead of one per Card. `components/Card.js` wrapped in `React.memo`; size calculations memoized with `useMemo`. Reduces re-renders during gameplay.
- ✅ **Fix #3:** `components/ErrorBoundary.js` added — class component wrapping `<NavigationContainer>` in App.js. Catches uncaught render errors and shows a dark-themed "Something went wrong" screen with "Return to Home" button instead of a blank white crash.
- ✅ **Fix #4:** `aiTimerRef` + useEffect cleanup added to `PokerGameScreen.js`, `ConquianGameScreen.js`, and `GoFishGameScreen.js`. Prevents AI setTimeout from firing on unmounted components after mid-game navigation. `LastCardGameScreen` and `WildRoundGameScreen` were already correct.
- ✅ **Fix #5:** `AppState` listener added to `App.js`. Calls `stopServer()`, `stopBroadcasting()`, `stopDiscovery()` when app goes to background. Prevents "port already in use" errors on next host attempt.

**What was added in this update session:**

- Profile system (name, avatar, photo upload+crop, card theme link, stats placeholder) — persists via AsyncStorage
- MultiplayerMenuScreen with Coming Soon online buttons
- Name fields removed from HostSetupScreen and JoinScreen (reads from profile)
- Card theme persisted via profile; Settings reduced to placeholder
- Wild Round removed from Single Player carousel (still fully functional in multiplayer)
- `game/responsive.js` with `scale()` / `scaleFont()` helpers; all screens now use responsive sizing
- Blackjack split: two same-rank cards dealt → Split button appears; play hand 0 then hand 1; dealer plays once against both; works in single-player and multiplayer
- Poker variants: Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud
- Poker picker changed from a wheel to a simple tap-select list
- Poker variant selection now saves back to the existing Lobby screen without dropping host params
- GameNetwork has a browser-safe fallback so the app can run in web dev mode without crashing
- Solitaire entry added to the single-player carousel and linked to the new picker screen
- Solitaire gameplay verified
- Rummy added back as a single + multiplayer game with Gin Rummy, Rummy 500, Indian Rummy, and Canasta
- Variant pickers unified behind a shared `components/VariantPicker.js` component

**Card Night currently includes 8 working games:**

- Blackjack (single + multiplayer)
- Go Fish (single + multiplayer, with AI Easy/Medium/Hard; hand auto-sorts by rank)
- Texas Hold'em Poker (single + multiplayer, with AI Easy/Medium/Hard)
- Conquián (single + multiplayer, with AI Easy/Medium/Hard)
- Rummy (single + multiplayer, Gin Rummy / Rummy 500 / Indian Rummy / Canasta)
- Wild Round (single + multiplayer, 3-8 players, party-style)
- Last Card (single + multiplayer, 2-8 players, AI single difficulty)
- Solitaire (single-player only, Klondike / Spider / FreeCell / Pyramid / TriPeaks)

**Visual assets update:** Cards now use neon image assets in `assets/cards/` (replaced procedural drawing).

**EAS build status:** A new EAS build was required for Update Phase 3 (added `@react-native-async-storage/async-storage`). `expo-image-picker` and `expo-image-manipulator` are Expo-native and didn't require a separate build. Current build includes all packages through Phase 9. **A new EAS build is pending for the C1 network permissions added on 2026-05-09.**

**Removed games (cleaned up):** Crazy Eights, War, Snap. These were intentionally cut to keep the lineup focused.

## 🔮 Next Steps When We Resume

### Update Session (current) — Coin Economy + Betting + Save/Resume — COMPLETE ✅

**Phase 1 — Coin Wallet & Economy:**
- ✅ `game/wallet.js` created — getCoins, setCoins, addCoins, subtractCoins, resetCoins, getLifetimeEarned
- ✅ `ProfileScreen.js` — coin balance display + Reset to 1000 button + confirmation
- ✅ `HomeScreen.js` — small gold coin pill showing balance
- ✅ `SolitaireGameScreen.js` — +250 coins on win (single-player only), win banner
- ✅ `RummyGameScreen.js` — +500 coins on single-player win
- ✅ `ConquianGameScreen.js` — +500 coins on single-player win
- ✅ `LastCardGameScreen.js` — +500 coins on single-player win
- ✅ `GoFishGameScreen.js` — +500 coins on single-player win
- ✅ `PokerVariantPickerScreen.js` — buy-in selector (100/250/500/1000), wallet balance, disabled when broke
- ✅ `PokerGameScreen.js` — buy-in subtracted on start, chips = starting stack, tournament winner gets chips→coins

**Phase 2 — Blackjack Betting:**
- ✅ `GameScreen.js` — three-state flow (betting → playing → result), 5 bet presets (10/25/50/100/250), wallet integration, standard casino payouts, split support, Game Over modal, "Continue" / "Adjust Bet" buttons

**Phase 3 — Save & Resume:**
- ✅ `game/gameSaves.js` — saveGame, loadGame, clearGame, hasSave (AsyncStorage, JSON, error-safe)
- ✅ `GameScreen.js` — auto-save during active hand, restore on resume, clear on new hand / game over
- ✅ `SolitaireGameScreen.js` — auto-save on every move, restore via __RESTORE__ wrapper reducer, clear on win / New Game
- ✅ `GoFishGameScreen.js` — auto-save on state change, restore via fullRef, clear on results
- ✅ `LastCardGameScreen.js` — auto-save on state change, restore via fullRef + handleTurn re-trigger, clear on win
- ✅ `RummyGameScreen.js` — auto-save on state change, restore via fullRef, clear on game over / Play Again
- ✅ `ConquianGameScreen.js` — auto-save on state change, restore via fullRef, clear on results / Play Again
- ✅ `PokerGameScreen.js` — auto-save on state change, restore skips buy-in deduction, clear on tournament end
- ✅ `SinglePlayerSetupScreen.js` — "Game in Progress?" prompt before Blackjack
- ✅ `SolitaireVariantPickerScreen.js` — "Game in Progress?" prompt per variant
- ✅ `RummyVariantPickerScreen.js` — "Game in Progress?" prompt per Rummy variant + Conquian
- ✅ `PokerVariantPickerScreen.js` — "Game in Progress?" prompt per Poker variant
- ✅ `GameSetupScreen.js` — "Game in Progress?" prompt for Go Fish + Last Card

Save keys: `@cardnight:save:<game>[:<variant>]`

### Rummy Crash Fix

**Bug:** All 4 Rummy variants crashed immediately on launch.

**Root cause:** Two `useEffect` calls in `screens/RummyGameScreen.js` were placed *after* the `if (!gameState) return <loading>` early return. On the first render `gameState` is null, so the early return fires and those hooks are never called. On the second render (after `initGame()` sets state) the early return is skipped and the hooks fire — changing the hook count between renders. React throws a "change in order of Hooks" error and crashes the screen.

**Fix:** Moved the two `useEffect` blocks (auto-save and coin reward) to *before* the `if (!gameState)` guard. Their internal null guards (`if (!fullRef.current) return` and `gameState?.winner` optional chaining) keep them safe when state is still null.

**⚠️ Known follow-up — ConquianGameScreen has the identical bug:** One `useEffect` at line ~603 sits after early returns at lines ~484 and ~490. Conquian appears to work currently because the first render's state initializes synchronously enough to avoid the mismatch in testing — but it is a latent crash risk. Should be fixed in a dedicated session.

### Pre-Publish Prep Session (Month 1 block — 2026-05-09)

- ✅ **H1:** Deleted stale `.tmp` scratch files; added `*.tmp` to `.gitignore`
- ✅ **L1:** Created `README.md` — setup steps, EAS build commands, links to spec files
- ✅ **H2:** Updated `PROJECT_NOTES.md` to reflect `ThemeContext.js` refactor (file tree, Card.js description, theme system files list)
- ✅ **M9:** Extracted `game/useResumePrompt.js` — custom hook encapsulating the save/resume Alert pattern. Refactored 5 screens to use it: `SinglePlayerSetupScreen`, `RummyVariantPickerScreen`, `SolitaireVariantPickerScreen`, `PokerVariantPickerScreen`, `GameSetupScreen`
- ✅ **C6+H3:** Added `PROTOCOL_VERSION = 1` to `game/GameNetwork.js`. Every outgoing TCP message now carries `protocolVersion`. Server rejects mismatched clients with a `VERSION_MISMATCH` message then closes the socket. Client shows a friendly "Update Required" Alert on mismatch. UDP broadcast and discovery both include/check `protocolVersion`.
- ✅ **C1:** Added Android (`NEARBY_WIFI_DEVICES`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `INTERNET`) and iOS (`NSLocalNetworkUsageDescription`, `NSBonjourServices`) permissions to `app.json`. **A new EAS build is required before these take effect on device.**

### After this session
1. **Run a new EAS build** so C1 permissions are active on device (Android + iOS)
2. **Phase 5: Visual Theme Project** (paused until on better PC)
3. **Phase 6: Publish** — Google Play + App Store

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

**Wild Round:** Party game (CAH-style with original/CC0 content only). 3-8 players. 10-card hand of answers. Judge rotates each round. Judge can skip Prompt 1 once per game. Multiplayer only. Left in Lobby; removed from Single Player carousel.

**Last Card:** UNO-style/clan game. 2-8 players. Works single-player and multiplayer. AI single difficulty supported.

**Solitaire:** Single-player only. 5 versions: Klondike, Spider, FreeCell, Pyramid, TriPeaks.

**Rummy:** Single + multiplayer. 4 versions: Gin Rummy, Rummy 500, Indian Rummy, Canasta. AI single difficulty supported. Lobby and Single Player picker are wired.

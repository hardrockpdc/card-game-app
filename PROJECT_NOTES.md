# 📋 Project Summary — Card Night

> **This is the canonical project doc.** On 2026-06-04 the change/planning/review
> docs were consolidated in here so there's one place to look. The big sections
> below were merged from their own files (now deleted):
> [Responsive Layout & Orientation](#-responsive-layout--orientation-architecture),
> [Deep Code Review tracker](#-deep-code-review--open-issues--tracker),
> [Build & Release status](#-build--release-status),
> [Kickoff brief](#-kickoff-brief-historical).
>
> **Still separate (reference, not change-tracking):** per-game rules specs
> (`CONQUIAN_SPEC.md`, `LASTCARD_SPEC.md`, `WILDROUND_SPEC.md`), `Animations.md`
> (animation spec), `APP_STORE_REVIEW_NOTES.md`, `README.md`, and `CLAUDE.md`
> (the working agreement, loaded every session).

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
  - **UX4:** `expo-audio` installed; `game/sounds.js` preloads card_flip/card_deal/win/error sounds; wired into Blackjack (deal, hit, win) and Toast (error on any illegal move); silent WAV placeholders in `assets/sounds/` — replace with real audio files; `initSounds()` called from App.js (awaits EAS build)
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
  - ⚠️ **EAS is the ONLY working build path on Pedro's machine.** There is no local Android toolchain — `adb` is not on PATH and the Android SDK isn't set up, so `npx expo run:android` fails with "No Android connected device found" and can never install a native build. The dev client on the phone always comes from EAS.
  - **Native-module changes** (anything in `app.json` plugins, or a dep with a native side like `react-native-edge-to-edge`, `react-native-tcp-socket`, async-storage, etc.) only take effect after a fresh EAS build is installed: `eas build --profile development --platform android`, then install the printed APK on the phone, then `npx expo start --dev-client`.
  - **Pure-JS changes** hot-reload instantly over Metro — no build needed. Running `expo start --dev-client` against an old binary only updates JS; if the new JS imports a native module the old binary lacks, the app crashes (e.g. "RNEdgeToEdge could not be found"). So batch native changes and rebuild once.
- **Source control:** Git + GitHub (https://github.com/hardrockpdc/card-game-app)
- **Package ID:** `com.pedro.cardgameapp`
- **App display name:** Card Night

## 📂 Current Project Structure

```
card-game-app/
├── assets/
│   └── sounds/                    (card_flip.wav, card_deal.wav, win.wav, error.wav — silent placeholders, replace with real audio)
├── components/
│   ├── Card.js                    (reusable playing card visual + flip/deal animation engine)
│   ├── PokerVariantWheel.js       (exports POKER_VARIANT_OPTIONS, used by Lobby/HowToPlay — stripped to the constant 2026-06-19)
│   ├── VariantOptionGrid.js       (shared variant-card grid used by the pickers — replaced the old VariantPicker/Wheel components)
│   ├── GameSetupLayout.js         (shared picker/setup screen layout shell)
│   ├── ScrollWheelPicker.js       (scroll-wheel selector used by LobbyScreen)
│   ├── Toast.js                   (animated pill toast + useToast hook — illegal move feedback + error sound)
│   ├── GameHeader.js              (standardized dark navy header card — ☰ expands in-place; props: gameId/title/subtitle/leftInfo/extraButton/menuItems)
│   ├── GameMenu.js                (pure item-list renderer + MenuDivider — no modal; handles: divider/sound/restart/howto/theme/quit/generic)
│   ├── GameMenuButton.js          (Modal-panel ☰ menu used by Solitaire's landscape board)
│   ├── StatsStrip.js              (single-row live-stats strip below GameHeader, accent from getTableTheme; opt-in `stacked`)
│   ├── TableThemePicker.js        (reusable felt-palette picker overlay — Rummy/Poker/Go Fish)
│   ├── CardThemePicker.js         (card-theme picker overlay)
│   ├── TutorialOverlay.js         (first-time tutorial modal — slide carousel, AsyncStorage seen-tracking, Skip/Got It)
│   ├── EndOfRoundModal.js         (reusable round-end modal — title, message, Continue/AdjustBet/Leave buttons, tableColor border tint)
│   ├── YourTurnBanner.js          (animated "your turn" banner — used by Last Card)
│   ├── useYourTurnBanner.js       (hook backing YourTurnBanner)
│   ├── ReconnectOverlay.js        (mid-game drop pause/countdown — Go Fish pilot)
│   ├── HowToShot.js               (annotated gameplay screenshot — image + numbered dots + legend, used by HowToPlayScreen)
│   ├── ProfileAvatar.js           (avatar/photo/initial renderer)
│   ├── useMultiplayerAvatars.js   (hook — exchanges profile pics across multiplayer at game start)
│   ├── useSolitaireDrag.js        (gesture-handler drag hook for Solitaire)
│   ├── useConquianMeldDrag.js     (gesture-handler drag hook for Conquián melds)
│   ├── Haptic.js                  (haptic-feedback wrapper component)
│   ├── Confetti.js                (win celebration particles)
│   └── ErrorBoundary.js           (class component wrapping NavigationContainer — catches render crashes, shows dark fallback screen)
│
│   (Removed: VariantPicker.js, RummyVariantWheel.js, SolitaireVariantWheel.js — picker
│    redesign dead code, deleted 2026-06-19 `f09bfd8`; QuitButton.js — deleted in R5,
│    replaced by GameHeader. Historical session entries below still name these files.)
├── game/
│   ├── deck.js                    (createDeck, shuffleDeck, calculateHandValue)
│   ├── cardTheme.js               (module singleton — 386 static requires across 7 themes; setTheme/getTheme/subscribe/getCardImage/...)
│   ├── ThemeContext.js            (React context wrapping cardTheme.js — single listener, shared across all Cards)
│   ├── conquian.js                (Conquián game logic — pure functions)
│   ├── wildround.js               (Wild Round game logic — pure functions)
│   ├── whoami.js                  (Who Am I? game logic — pure functions; + test bots)
│   ├── lastCard.js                (Last Card game logic — pure functions)
│   ├── lastCardImages.js          (109-image LastCard require map — extracted from the screen, CQ-5)
│   ├── gofish.js                  (Go Fish game logic — pure functions; extracted from the screen 2026-06-02)
│   ├── poker.js                  (Poker variant logic — Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud)
│   ├── solitaire.js               (Solitaire game logic — Klondike, Spider, FreeCell, Pyramid, TriPeaks; getLegalTargets/getHint)
│   ├── rummy.js                   (Rummy game logic — Gin Rummy, Rummy 500, Indian Rummy, Canasta)
│   ├── wildroundCards.json        (100 prompts + 300 answers — Phase E complete)
│   ├── GameNetwork.js             (TCP server/client + UDP discovery)
│   ├── wallet.js                  (coin balance + lifetime earnings — plain AsyncStorage, local-only)
│   ├── gameSaves.js               (saveGame/loadGame/clearGame/hasSave — AsyncStorage, JSON, SAVE_VERSION-validated)
│   ├── useResumePrompt.js         (custom hook — the "Game in Progress?" save/resume Alert pattern)
│   ├── useLayoutMode.js           (wide/tall/balanced hook off useWindowDimensions — responsive sizing)
│   ├── logger.js                  (log/warn — no-ops in production builds via __DEV__)
│   ├── haptics.js                 (initHaptics/haptic — expo-haptics wrapper; graceful no-op if unavailable)
│   ├── avatars.js                 (emoji preset avatar list/helpers)
│   ├── avatarTransmit.js          (encode/decode avatars for multiplayer — emoji pass-through, photos → 120px JPEG base64)
│   ├── profile.js                 (loadProfile, saveProfile, subscribeProfile, getDisplayName, recordWin — AsyncStorage)
│   ├── responsive.js              (scale(), scaleFont() — BASE_WIDTH 390, clamped factors)
│   ├── sounds.js                  (initSounds/playSound/getMuted/setMuted — expo-audio; preloads 4 sounds on app start; graceful no-op if unavailable)
│   ├── tablePalette.js            (createTablePalette factory — switchable felt palettes, reuses LAST_CARD_TABLES)
│   ├── lastCardTheme.js           (Last Card felt-palette wrapper — init/get/set)
│   ├── rummyTheme.js              (Rummy felt-palette wrapper — init/get/set)
│   ├── pokerTheme.js              (Poker felt-palette wrapper — init/get/set)
│   ├── gofishTheme.js             (Go Fish felt-palette wrapper — init/get/set)
│   └── tableThemes.js             (TABLE_THEMES map + getTableTheme(gameId) — table/accent colors per game)
├── screens/
│   ├── HomeScreen.js              (main menu)
│   ├── HostSetupScreen.js         (name from profile, starts TCP server, shows IP)
│   ├── JoinScreen.js              (UDP auto-discovery list, tap to join)
│   ├── LobbyScreen.js             (player list, game selector, Start Game)
│   ├── GameScreen.js              (single-player Blackjack — always casino/coins; Free Play removed 2026-06-02)
│   │                              (MultiplayerGameScreen.js — multiplayer Blackjack — REMOVED 2026-06-18, dropped from flow)
│   ├── GoFishGameScreen.js        (Go Fish — single + multiplayer)
│   ├── GoFishPickerScreen.js      (Go Fish setup — variant card + AI count + difficulty)
│   ├── PokerGameScreen.js         (Poker variants: Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud)
│   ├── PokerVariantPickerScreen.js (tap-select poker variant picker)
│   ├── SolitaireVariantPickerScreen.js (tap-select solitaire variant picker)
│   ├── SolitaireGameScreen.js      (Solitaire — single-player only)
│   ├── ConquianGameScreen.js      (Conquián — single + multiplayer)
│   ├── ConquianSetupScreen.js     (Conquián setup screen — registered route "ConquianSetup")
│   ├── WildRoundGameScreen.js     (Wild Round — single + multiplayer)
│   ├── WhoAmIGameScreen.js        (Who Am I? — multiplayer party game, no cards; the app's 9th game, added 2026-06-18→20)
│   ├── LastCardGameScreen.js      (Last Card — single + multiplayer)
│   ├── SinglePlayerSetupScreen.js (single-player game + AI picker; Wild Round removed from carousel)
│   ├── MultiplayerMenuScreen.js   (Host Online/Join Online = Coming Soon; Host Local/Join Local = functional)
│   ├── RummyGameScreen.js         (Rummy — single + multiplayer)
│   ├── RummyVariantPickerScreen.js (tap-select Rummy variant picker; also launches Conquián)
│   ├── ProfileScreen.js           (name, avatar/photo picker, card theme link; More section → Stats + About)
│   ├── CardThemeScreen.js         (full-screen theme swiper — Ace of Spades preview, "Use This Theme")
│   ├── HowToPlayScreen.js         (rules reference screen)
│   ├── ResultsScreen.js           (real implementation — winner headline, scoreboard, Play Again / Back to Menu)
│   ├── AboutScreen.js             (app name, version from app.json, credits, copyright, Privacy Policy link)
│   ├── StatsScreen.js             (Total Wins + Lifetime Coins summary; per-game win table, green on wins > 0)
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
dependencies:
@react-native-async-storage/async-storage: ^2.2.0  (profile/save persistence — requires EAS build)
@react-navigation/native: ^7.2.2
@react-navigation/native-stack: ^7.14.11
@sentry/react-native: ~7.2.0               (crash/error reporting — native, requires EAS build)
expo: ~54.0.35
expo-asset: ~12.0.13
expo-audio: ~1.1.1                         (sound effects — NOTE: expo-audio, not the older expo-av; requires EAS build)
expo-clipboard: ~8.0.8                     (tap-to-copy IP — requires EAS build)
expo-constants: ~18.0.13
expo-dev-client: ~6.0.21
expo-haptics: ~15.0.8                       (haptic feedback — native, requires EAS build; see game/haptics.js)
expo-image-manipulator: ~14.0.8            (photo crop to 1:1 — Expo-native, no extra native module)
expo-image-picker: ~17.0.11               (camera roll + camera access — Expo-native)
expo-network: ~8.0.8
expo-screen-orientation: ~9.0.9            (runtime orientation lock — portrait app-wide, landscape for Solitaire; requires EAS build)
expo-status-bar: ~3.0.9
expo-system-ui: ~6.0.9
expo-updates: ~29.0.18                     (OTA updates channel)
fbjs: ^3.0.5
react: 19.1.0
react-dom: 19.1.0                          (web build only)
react-native: 0.81.5
react-native-edge-to-edge: ^1.8.1          (SystemBars — hide status + nav bars under edge-to-edge; requires rebuild)
react-native-gesture-handler: ~2.28.0      (drag-and-drop for Solitaire/Conquián; requires EAS build)
react-native-safe-area-context: ~5.6.0
react-native-screens: ~4.16.0
react-native-tcp-socket: ^6.4.1
react-native-udp: ^4.1.7
react-native-web: ^0.21.0                  (web build only)

(react-native-draggable-flatlist was removed 2026-06-04 — never used; hand-sort polish was dropped.)

devDependencies:
jest: ^29.7.0                              (unit tests for pure game logic — `npm test`)
babel-jest: ^29.7.0
@babel/core: ^7.29.7
@babel/preset-env: ^7.29.7
prettier: ^3.8.3
sharp: ^0.34.5                             (used by scripts/compress-cards.js)
```

## 🎨 Visual Style

- Dark navy background (`#1a1a2e`) on menu screens (Home, Profile,
  Setup, Variant Pickers, Lobby, Stats, About)
- Red/pink accent (`#e94560`) for primary buttons
- **Per-game table colors via `game/tableThemes.js`** — each game has
  its own immersive table color + accent color:
  - Blackjack/Poker: forest green `#35654D`, gold accent `#FFD700`
  - Solitaire: casino blue `#01889F`, pale blue accent `#7FB3FF`
  - Rummy/Conquian: crimson `#B22222`, cream accent `#FFE4B5`
  - Go Fish: ocean blue `#0D6E8C`, pale aqua accent `#A8E6FF`
  - Last Card/Wild Round: dark navy `#1a1a2e`, red-pink accent `#e94560`
- Cards use PNG image assets (see Card Themes below)
- Hidden/face-down card uses each theme's `card_back.png`
- Game screens use standardized `GameHeader` + `StatsStrip` + ☰ menu
  pattern across all 9 games

## 🃏 Card Themes

Theme switching is live — tap a theme in Profile → Card Theme and all open games update instantly. No restart needed. **Theme is now persisted via AsyncStorage** (saved as part of the profile) — survives app restarts. Theme picker moved from Settings to Profile in Update Phase 4.

| Theme ID | Label   | Asset folder                |
| -------- | ------- | --------------------------- |
| classic  | Classic | assets/card_images_classic/ |
| neon     | Neon    | assets/cards/               |
| cowboy   | Cowboy  | assets/cards_cowboy/        |
| girly    | Girly   | assets/card_images_girly/   |
| wizards  | Wizards | assets/card_images_hp/      |
| gothic   | Gothic  | assets/card_images_gothic/  |
| pirate   | Pirate  | assets/card_images_pirate/  |

All folders use identical filenames: `{rank}_{suit}.png` (ranks: a 2–10 j q k, suits: spades hearts diamonds clubs) + `card_back.png`.

**Theme system files:**

- `game/cardTheme.js` — module singleton, 386 static requires across 7 themes (52 cards + back + joker + preview per theme), `setTheme`/`getTheme`/`subscribe`/`getCardImage`/`getCardBackImage`/`getThemePreviewImage`/`THEMES_LIST` exports
- `game/ThemeContext.js` — React context wrapping `cardTheme.js`; provides `useTheme()` hook; single AppState subscriber shared across all Card instances (replaces per-Card `useEffect` subscribers)
- `components/Card.js` — uses `ThemeContext` via `useTheme()`; wrapped in `React.memo`; size calculations memoized with `useMemo`
- `screens/CardThemeScreen.js` — full-screen swiper (FlatList pagingEnabled), Ace of Spades preview, dot indicators, "Use This Theme" button
- `screens/ProfileScreen.js` — "Card Theme" row links to `CardThemes` route
- `screens/SettingsScreen.js` — now a plain placeholder ("More settings coming soon"); Card Themes row removed

## 🔐 Security Model

### Coin Wallet (v1.0 — local only, no encryption)

`game/wallet.js` stores the coin balance and lifetime earnings in plain
`AsyncStorage` (JSON, no encryption). A user with a rooted Android device
could manually edit the stored value and give themselves an arbitrary coin
balance.

**Why this is acceptable for v1.0:**

- Coins are purely local — there is no server, no leaderboard, and no way
  for one player's coin total to affect another player's experience.
- Cheating your own coin balance in a local card game has zero impact on
  anyone else.

**What must change before adding a leaderboard:**
This MUST be addressed before shipping any feature that compares coin totals
across players (leaderboard, achievements, ranked play). Two viable paths:

1. **Signed/encrypted local storage** — use a library like
   `react-native-encrypted-storage` to store coins under device-level
   encryption. Harder to tamper with, but still possible on rooted devices.
2. **Server-validated transactions** — move coin earning/spending to a backend
   that validates each transaction. Correct but adds significant infrastructure.

Path 2 is the right long-term answer. Don't ship a leaderboard without it.

### Profile & Save Data

Same situation — `profile.js` and `gameSaves.js` both use plain AsyncStorage.
Profile data (name, avatar, stats) and save game state are all readable and
editable on a rooted device. Acceptable for v1.0 local-only play.

### Network Security

All multiplayer traffic is local TCP (port 7777) and UDP discovery (port 7778).
No data is ever sent to the internet. No user accounts. No analytics. No ads.
The only permissions that touch the network are `NEARBY_WIFI_DEVICES` /
`ACCESS_WIFI_STATE` (Android) and `NSLocalNetworkUsageDescription` (iOS) —
both explicitly for LAN-only play.

---

## 📐 Layout Conventions

- Use `SafeAreaProvider` at the app root.
- Use `SafeAreaView` from `react-native-safe-area-context`, not the deprecated React Native version.
- Make key screens responsive with `useWindowDimensions()`.
- Prefer `ScrollView` for screens that may overflow on smaller phones.
- Avoid absolute positioning for important buttons or navigation links unless there is a strong reason.
- **Orientation:** the app is **portrait-locked app-wide, with Solitaire the sole landscape exception** (runtime `expo-screen-orientation`, pure JS). Responsive *sizing* (`game/useLayoutMode.js`) still adapts within the locked orientation. Full rule + rationale: see the [Responsive Layout & Orientation Architecture](#-responsive-layout--orientation-architecture) section.
- **Immersive mode:** `App.js` renders `<SystemBars hidden style="light" />` from **react-native-edge-to-edge** to hide both the status bar and the navigation bar. This is the edge-to-edge-correct approach for SDK 54 — `expo-navigation-bar`'s visibility API is a deprecated no-op under edge-to-edge (which is on by default), so it was removed. A swipe from an edge reveals the bars briefly.

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

**Card Night currently includes 9 working games:**

- Blackjack (single-player; multiplayer Blackjack screen removed 2026-06-18)
- Go Fish (single + multiplayer, with AI Easy/Medium/Hard; hand auto-sorts by rank)
- Texas Hold'em Poker (single + multiplayer, with AI Easy/Medium/Hard)
- Conquián (single + multiplayer, with AI Easy/Medium/Hard)
- Rummy (single + multiplayer, Gin Rummy / Rummy 500 / Indian Rummy / Canasta)
- Wild Round (single + multiplayer, 3-8 players, party-style)
- Last Card (single + multiplayer, 2-8 players, AI single difficulty)
- Solitaire (single-player only, Klondike / Spider / FreeCell / Pyramid / TriPeaks)
- Who Am I? (multiplayer party game, no cards; first to 3 round-wins — added 2026-06-18→20)

**Visual assets update:** Cards now use neon image assets in `assets/cards/` (replaced procedural drawing).

**EAS build status:** A new EAS build was required for Update Phase 3 (added `@react-native-async-storage/async-storage`). `expo-image-picker` and `expo-image-manipulator` are Expo-native and didn't require a separate build. Current build includes all packages through Phase 9. **A new EAS build is pending for the C1 network permissions added on 2026-05-09.**

**Removed games (cleaned up):** Crazy Eights, War, Snap. These were intentionally cut to keep the lineup focused.

## 🔮 Next Steps When We Resume

### Foundation Sessions (2026 early-mid) — Coin Economy + Betting + Save/Resume — COMPLETE ✅

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
- ✅ `SolitaireGameScreen.js` — auto-save on every move, restore via **RESTORE** wrapper reducer, clear on win / New Game
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

### Month 3 Pre-Launch Session (2026-05-09) — COMPLETE ✅

All JS-only items from the Month 3 block are done:

- ✅ **C4** — Security model documented in PROJECT_NOTES.md (wallet trust model: plain AsyncStorage, local-only, acceptable for v1.0, must address before leaderboard)
- ✅ **C5** — `APP_STORE_REVIEW_NOTES.md` created — paste-ready review notes for App Store Connect and Google Play Console (LAN ports, demo flow, camera permission justification, no data collection)
- ✅ **UX10 + L9** — `screens/AboutScreen.js` + `screens/StatsScreen.js` created; `game/profile.js` now has `recordWin(gameId)` function; win tracking wired into all 7 game screens (Blackjack, Solitaire, GoFish, LastCard, Rummy, Conquián, Poker); Profile screen "More" section replaced with tappable Stats + About rows
- ✅ **UX2** — `components/TutorialOverlay.js` created; first-time tutorial wired into Blackjack (3 slides) and Gin Rummy (3 slides only); AsyncStorage key `@cardnight:tutorial:{gameId}` tracks seen state; overlay shows once then never again

**Still to do before EAS production build:**

- Manual test pass on phone — every game × every variant × single +
  multiplayer (Pedro handling ongoing as features are added)
- Replace silent sound WAV placeholders with real audio — DEFERRED
  (sound menu item temporarily removed; will revisit when real audio is
  sourced)
- Host privacy policy at GitHub Pages URL in `AboutScreen` (Pedro handling)
- Final app icons and splash screen (Pedro handling)
- WildRound save/resume — add auto-save + resume prompt + Save & Exit
  (currently the only single-player game without this feature)
- ✅ Poker Restart — DONE 2026-06-18 (`1723d77`): in-place fresh tournament,
  single-player; see the R8 note below for the rationale
- EAS production build (Pedro is currently 2-3 months out from publishing)

### Rummy Crash Fix

**Bug:** All 4 Rummy variants crashed immediately on launch.

**Root cause:** Two `useEffect` calls in `screens/RummyGameScreen.js` were placed _after_ the `if (!gameState) return <loading>` early return. On the first render `gameState` is null, so the early return fires and those hooks are never called. On the second render (after `initGame()` sets state) the early return is skipped and the hooks fire — changing the hook count between renders. React throws a "change in order of Hooks" error and crashes the screen.

**Fix:** Moved the two `useEffect` blocks (auto-save and coin reward) to _before_ the `if (!gameState)` guard. Their internal null guards (`if (!fullRef.current) return` and `gameState?.winner` optional chaining) keep them safe when state is still null.

**✅ Conquián fix follow-up (resolved 2026-05-12):** The same hooks-after-early-return pattern was identified in `ConquianGameScreen` and verified to be fixed during the N1-N13 cleanup session. Conquián now uses GameHeader + EndOfRoundModal correctly and has no remaining hooks-order issues.

### Pre-Publish Prep Session (Month 1 block — 2026-05-09)

- ✅ **H1:** Deleted stale `.tmp` scratch files; added `*.tmp` to `.gitignore`
- ✅ **L1:** Created `README.md` — setup steps, EAS build commands, links to spec files
- ✅ **H2:** Updated `PROJECT_NOTES.md` to reflect `ThemeContext.js` refactor (file tree, Card.js description, theme system files list)
- ✅ **M9:** Extracted `game/useResumePrompt.js` — custom hook encapsulating the save/resume Alert pattern. Refactored 5 screens to use it: `SinglePlayerSetupScreen`, `RummyVariantPickerScreen`, `SolitaireVariantPickerScreen`, `PokerVariantPickerScreen`, `GameSetupScreen`
- ✅ **C6+H3:** Added `PROTOCOL_VERSION = 1` to `game/GameNetwork.js`. Every outgoing TCP message now carries `protocolVersion`. Server rejects mismatched clients with a `VERSION_MISMATCH` message then closes the socket. Client shows a friendly "Update Required" Alert on mismatch. UDP broadcast and discovery both include/check `protocolVersion`.
- ✅ **C1:** Added Android (`NEARBY_WIFI_DEVICES`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `INTERNET`) and iOS (`NSLocalNetworkUsageDescription`, `NSBonjourServices`) permissions to `app.json`. **A new EAS build is required before these take effect on device.**

### Month 3 Polish Session (2026-05-09) — COMPLETE ✅

11 JS-only polish items completed (all committed, no EAS rebuild needed):

- ✅ **P1** — `game/tableThemes.js` created: `TABLE_THEMES` map + `getTableTheme(gameId)` for 8 games (blackjack, poker, solitaire, rummy, conquian, gofish, lastcard, wildround)
- ✅ **P3** — Nav headers hidden (`headerShown: false`) on all 9 game screens in `App.js`; `QuitButton.js` `top` moved to `scale(50)` so it clears the status bar
- ✅ **P2** — Table background colors unified via `getTableTheme`: Blackjack/Multiplayer → green `#35654D`; Solitaire → teal `#01889F`; Rummy/Conquian → crimson `#B22222`; GoFish → ocean blue `#0D6E8C`; Poker → `#35654D`; LastCard/WildRound → `#1a1a2e`
- ✅ **P4** — Solitaire "Back" + "New Game" inline buttons removed from game header; clean headerless layout
- ✅ **P10** — `SolitaireVariantPickerScreen` decluttered: kicker text and preview card block removed; title centered
- ✅ **P9** — Solitaire Klondike top row (stock, waste, 4 foundations) refactored to use computed slot size (`topSlotW/topSlotH`) for a consistent 6-slot layout across all screen widths; `klondikeTopRow` style added
- ✅ **P11** — Blackjack hand wrapping fixed: `useWindowDimensions` added; explicit `handWidth = width - 48` applied to all three hand containers (dealer, player, split); table horizontal padding reduced from `scale(20)` → `scale(12)` to give more card room
- ✅ **P8** — Deal button resized: `minHeight scale(56)→scale(78)` (+40%), `fontSize scaleFont(18)→scaleFont(23)` (×1.3x); active state uses gold accent (`ACCENT` from tableThemes), dark text; disabled state uses grey
- ✅ **P5** — `components/EndOfRoundModal.js` created: reusable round-end modal with title, message, and three optional action buttons (Continue/Play Again, Adjust Bet, Leave); `tableColor` prop tints the border
- ✅ **P6** — `EndOfRoundModal` wired into Blackjack (`GameScreen.js`): replaces inline status/coinsDelta text and the old result button row; out-of-coins modal also migrated to it
- ✅ **P7** — `screens/BlackjackModePickerScreen.js` created: Free Play / Casino selector before entering Blackjack; `GameScreen` reads `mode` param and branches on `isFree` — free mode uses `freeCoinsRef` (starts 1000, refills when low), skips wallet calls and game saves entirely

### UI Polish + Standardization Session (2026-05-12) — COMPLETE ✅

8 items, all JS-only (no EAS build needed):

- ✅ **R1** — `game/tableThemes.js` already complete from Month 3 Polish Session
- ✅ **R2** — `components/GameHeader.js` created: dark navy header card, ☰ button expands in-place (accordion), props: `gameId / title / subtitle / leftInfo / extraButton / menuItems`
- ✅ **R3** — `components/GameMenu.js` created: pure item-list renderer (`GameMenuItems` + `MenuDivider`), no modal; handles item types: divider / sound / restart / howto / theme / quit / generic fallback
- ✅ **R4** — Sound infrastructure wired (`game/sounds.js`, `getMuted`/`setMuted`). **Note:** Sound menu item was later removed from all 9 game screens (see 2026-05-13 session below) because no actual gameplay audio is hooked up yet. The infrastructure in `sounds.js` is preserved for future use.
- ✅ **R5** — `GameHeader` rolled out to all 9 game screens; `QuitButton.js` deleted; all screens now have SafeAreaView + GameHeader at top; `game/sounds.js` exports `getMuted`/`setMuted`; Solitaire `renderHeader()` collapsed Show/Hide replaced with always-visible `renderStatsBar()`
- ✅ **R6** — `EndOfRoundModal` rolled out to all remaining 8 screens (GoFish, Conquian, Rummy, LastCard, WildRound, Solitaire, Poker per-hand, Blackjack MP); WildRound no longer navigates to `ResultsScreen` — modal handles it in-place
- ✅ **R7** — Solitaire CardSlot empty label text overflow fix (`numberOfLines={1}` + `adjustsFontSizeToFit`, font 9→8, removed `lineHeight`); missing `scale` import added (caused crash on load)
- ✅ **R8** — Restart per game: all screens except Poker wire `handleRestart()` into the hamburger menu; Poker restart stubbed (disabled) — wallet/buy-in complexity TBD

**Poker restart — RESOLVED 2026-06-18 (commit `1723d77`).** Restart is now wired
into Poker's menu (single-player only). Decision: an **in-place fresh tournament**
— same opponents/variant/difficulty, all original players reset to the starting
stack (`initDeal(initialPlayers, 0, null, startingChips)`), a new hand dealt
immediately behind the standard "Restart Game?" confirm. Matches every other
game's Restart. ("Restart the current hand / same chips" was rejected — it's
meaningless mid-tournament since chips already moved with blinds/bets.)
Multiplayer restart (host re-deals for connected clients) is still out of scope.

**N1–N13 updates (this session):**

- ✅ **N1** — Last Card theme consistency: `getTableTheme("lastcard")` used for `tableColor` + `backgroundColor` (removed hardcoded `#0f0f1e`).
- ✅ **N4** — Poker UI polish: removed the **restart** entry from Poker’s hamburger `menuItems`.
- ~~**N6** — Solitaire UI: restored a SHOW/HIDE toggle~~ **SUPERSEDED:** The SHOW/HIDE toggle was fully removed in the "Regression resolved 2026-05-12" fix. Solitaire StatsStrip is always visible, matching all other game screens.
- ✅ **N12** — Blackjack modal fix: merged the “out of coins” overlay into the single `EndOfRoundModal` flow (no overlapping modals); leave action goes to **Profile** (`leaveLabel="Go to Profile"`).
- ✅ **N9** — Blackjack modal props: standardized `EndOfRoundModal` usage in `GameScreen` (`showLeave={true}` explicit).
- ✅ **N2** — Multiplayer Blackjack modal: `EndOfRoundModal` message now reflects the local player result (split-aware).
- ✅ **N3** — `EndOfRoundModal` accent bar added (tinted via `tableColor`).
- ✅ **N13** — `GameHeader` UX: hamburger menu now closes when tapping outside the expanded menu.

### Prettier Formatting Sweep (2026-05-12) — COMPLETE ✅

- ✅ `prettier@3.8.3` installed as a dev dependency
- ✅ `.prettierrc.json` created: double quotes, trailing commas, 2-space indent, 80-char print width
- ✅ `.prettierignore` created: excludes `node_modules/`, `assets/`, `android/`, `ios/`, lock files
- ✅ 49 files reformatted (formatting only — no logic changes)
- ✅ Single commit: `chore: prettier sweep (formatting only, no logic changes)`
- ✅ Pushed to GitHub, up to date with `origin/main`

**✅ Regression resolved (2026-05-12):** `showStatsBar` useState + SHOW/HIDE toggle fully removed from `SolitaireGameScreen.js`. StatsStrip is now always visible, matching all other game screens.

### Stats Strip Rollout Session (2026-05-12) — COMPLETE ✅

JS-only, no EAS rebuild needed. Added a unified live-stats strip below
the GameHeader on every game screen. Stats are always visible (no toggle).

- ✅ **S1** — `components/StatsStrip.js` created: single-row stats strip
  with label/value items, accent color from `getTableTheme(gameId)`,
  responsive layout (items fit on one row across screen widths)
- ✅ **S2** — Blackjack: Coins / Bet / Streak (wallet info MERGED into
  strip, no separate wallet bar); Free Play mode shows Mode / Hands
- ✅ **S3** — Multiplayer Blackjack: Players / Hand / Status
- ✅ **S4** — Solitaire: Moves / Time + variant-specific (Stock for
  Klondike/Spider, Free Cells for FreeCell, Pairs for Pyramid, Combo for
  TriPeaks). Timer starts on first move, stops on win. SHOW/HIDE toggle
  fully removed — stats always visible.
- ✅ **S5** — Poker: Chips / Pot / Blinds / Hand
- ✅ **S6** — Rummy: Round / Cards / Deadwood (accent) / Stock
- ✅ **S7** — Conquián: Hand / Melded / Stock / Phase
- ✅ **S8** — Go Fish: Pairs / Cards / Deck / Turn
- ✅ **S9** — Last Card: Cards / Deck / Direction / Turn
- ✅ **S10** — Wild Round: Score / Round / Judge / To Win

Follow-up fixes (same session): StatsStrip wrap bug fixed (items now
always fit on one row, no responsive wrap to 2 rows on narrow phones);
hex alpha helper added (`toRgba()`) for safe accent color tinting.

### Visual & UX Polish Session (2026-05-13) — COMPLETE ✅

JS-only, no EAS rebuild needed. 3 items:

- ✅ **ITEM 1** — Sound menu item removed from all 9 game screens (`GameScreen`, `MultiplayerGameScreen`, `SolitaireGameScreen`, `RummyGameScreen`, `ConquianGameScreen`, `GoFishGameScreen`, `PokerGameScreen`, `LastCardGameScreen`, `WildRoundGameScreen`). No gameplay audio is wired yet — a toggle that toggles nothing is confusing. `game/sounds.js` infrastructure kept intact for future audio work.

- ✅ **ITEM 2** — Solitaire timer persists through Save & Exit and resume. `elapsed` is now included in every save payload (`{ state, elapsed }`). On resume, `setElapsed(saved.elapsed)` restores the clock. Initial mount skips `setElapsed(0)` when `resumeFromSave` is true. Undo history is stripped from the save payload (`history: undefined`) to keep save files small.

- ✅ **ITEM 3** — Solitaire Undo added. Access via ☰ → Undo (↩️). Unlimited depth in-session; history resets on Save & Exit / resume (not saved to disk).
  - `game/solitaire.js`: `SOLITAIRE_ACTIONS.UNDO` + `undoAction()` export. `history: []` added to all 5 variant initial states. Reducer pushes a history-free snapshot on each real move (when `moves` or `pairs` increments); pops on UNDO. History cleared on win.
  - `components/GameMenu.js`: new `undo` item type (↩️ icon, greyed out when no history).
  - `screens/SolitaireGameScreen.js`: `undoAction` imported; undo item added to `menuItems` above restart; `disabled` when `state.history` is empty.

### Save & Exit Feature (2026-05-12) — COMPLETE ✅

JS-only, no EAS rebuild needed. "Save & Exit" added to the ☰ hamburger menu on all single-player game screens except Blackjack and WildRound.

**How it works:**
- **Save & Exit** → saves current state immediately + navigates to Home (save is kept)
- **Quit Game** → clears the save + navigates to Home (progress abandoned — unchanged)
- **Restart Game** → clears the save + starts a fresh round (unchanged)

On next entry to the game, the existing "Game in Progress?" resume prompt appears automatically.

**Wired into (6 screens):**
- ✅ `SolitaireGameScreen.js` — saves `{ state }` with key `@cardnight:save:solitaire:${variantId}`
- ✅ `RummyGameScreen.js` — saves `{ fullState: fullRef.current }` with key `@cardnight:save:rummy:${variantId}`; single-player only (hidden in multiplayer)
- ✅ `ConquianGameScreen.js` — saves `{ fullState: fullRef.current }` with key `@cardnight:save:rummy:conquian`; single-player only
- ✅ `GoFishGameScreen.js` — saves `{ fullState: fullRef.current }` with key `@cardnight:save:gofish`; AI history included in save; single-player only
- ✅ `LastCardGameScreen.js` — saves `{ fullState: fullRef.current }` with key `@cardnight:save:lastcard`; play direction + active color included; single-player only
- ✅ `PokerGameScreen.js` — saves `{ fullState: fullRef.current }` with key `@cardnight:save:poker:${variant}`; full tournament state (chips, blinds, hand, pot) included; single-player only

**Skipped / deferred:**
- ❌ `GameScreen.js` (Blackjack) — skipped by design; no mid-hand save concept
- ❌ `MultiplayerGameScreen.js` — multiplayer doesn't save; skipped by design
- ❌ `WildRoundGameScreen.js` — **no save/resume system exists** for WildRound. Adding Save & Exit requires first building the full auto-save + resume prompt layer. Deferred to a future session.

**GameMenu.js change:** New `saveexit` item type added. Renders 💾 icon + "Save & Exit" label. No confirmation dialog (low-risk action). Disabled if `onSaveExit` callback is missing.

### Visual + UX Standardization Session (2026-05-13) — COMPLETE ✅

JS-only, no EAS rebuild needed. All picker screens brought to a shared visual contract.

**Shared visual contract applied to all pickers:**
- Dark navy backdrop (`#0f1115`)
- Game name as large centered title
- All selectors inside one rounded panel card
- Variant cards: vertical stack, blue accent border + tinted background when selected
- AI Opponents + Difficulty: pill button rows with section labels (uppercase, muted)
- Start Game button: blue (`#77aef7`), dark text (`#08111f`), full-width, bold

**Items completed:**

- ✅ **ITEM 1** — `components/VariantPicker.js`: selected background now uses `hexToRgba(accentColor, 0.12)` instead of hardcoded red tint. Fixes selected card fill for all pickers.

- ✅ **ITEM 4** — `screens/BlackjackModePickerScreen.js`: Free Play / Casino cards now stack vertically (same as all other pickers). Descriptions updated to spec ("Practice mode. No coins won or lost." / "Bet coins to win big payouts."). Emoji removed for cleaner look.

- ✅ **ITEM 2** — `screens/RummyVariantPickerScreen.js`: Title → "Rummy"; Start Game button → blue; section label → "AI Opponents"; Conquián locks AI count to 1 with a note ("Conquián is 1v1"); "Current selection" summary card removed; all selectors inside panel card.

- ✅ **ITEM 3** — `screens/PokerVariantPickerScreen.js`: Title → "Poker"; Start Game button → blue; section label → "AI Opponents"; buy-in moved inside the panel (below Difficulty, above Start Game); "Current selection" summary card removed.

- ✅ **ITEM 5** — `screens/GoFishPickerScreen.js` created: single variant card "Go Fish" + AI Opponents selector (1-3) + Difficulty selector. Reads profile name. Passes `role/myName/players/difficulty/resumeFromSave` to `GoFishGame`. Registered in App.js as route `"GoFishPicker"` (headerShown: false).

- ✅ **ITEM 6** — `screens/SinglePlayerSetupScreen.js`: Go Fish now routes to `GoFishPicker` instead of `GameSetup`. Both the Play button and tapping the carousel card tile open the new picker. Last Card still uses `GameSetup` (unchanged).

- ✅ **ITEM 7 (verify only)** — `screens/GameSetupScreen.js`: No changes made. After Go Fish migration it serves only Last Card. Last Card still needs difficulty + AI count (1–7 stepper). Kept as-is.

**What was NOT changed:**
- `GameSetupScreen.js` — still serves Last Card only; preserved as-is
- `RummyVariantPickerScreen` lobby mode — title/button stay as-is for the lobby flow
- `PokerVariantPickerScreen` lobby mode — same
- Wild Round, Last Card — excluded from this session per Pedro's earlier request

### After this session

1. **Run a new EAS build** so C1 permissions are active on device (Android + iOS)
2. **WildRound save/resume** — add auto-save + resume prompt + Save & Exit (deferred from Save & Exit session)
3. **Phase 5: Visual Theme Project** (paused until on better PC)
4. **Phase 6: Publish** — Google Play + App Store

### S-series StatsStrip (S1–S10) — COMPLETE ✅

- ✅ **S1** — `components/StatsStrip.js` created: reusable responsive stats bar (label/value items, accent support)
- ✅ **S2** — Blackjack StatsStrip: Coins/Bet/Streak with wallet values merged
- ✅ **S3** — Multiplayer Blackjack StatsStrip: Players / Hand / Status (accent) inserted immediately after `GameHeader` in `screens/MultiplayerGameScreen.js`
  - Added `handNumber` counter to the multiplayer broadcast state (increments on Play Again)
- ✅ **S4** — Solitaire StatsStrip: Moves/Time/Stock + variant-specific stats (SHOW/HIDE toggle removed)
- ✅ **S5** — Poker StatsStrip: Chips/Pot/Blinds/Hand
- ✅ **S6** — Rummy StatsStrip: Round/Score/Cards/Stock
- ✅ **S7** — Conquián StatsStrip: Hand/Melded/Stock/Phase
- ✅ **S8** — Go Fish StatsStrip: Pairs/Cards/Deck/Turn
- ✅ **S9** — Last Card StatsStrip: Phase/Turn/Draw (committed; treat as done per session notes)
- ✅ **S10** — Wild Round StatsStrip: Score/Round/Judge/To Win inserted immediately after `GameHeader` in `screens/WildRoundGameScreen.js`
  - Added `roundNumber` to the multiplayer public state, initialized to **1**, incremented when host taps **Next Round**

Phone checks passed for **S10** (Wild Round) and **S3** (Multiplayer Blackjack): “all good”.

### Table-Layout + Table-Theme Session (2026-06-17) — COMPLETE ✅

Pure-JS UI work (no native changes, no EAS build needed). All committed on `main`.

**Table-style layout redesigns** — gave Poker, Go Fish, and Rummy a consistent
"table" feel: opponents seated, a centered board/piles area, and the player's
hand pinned at the bottom. The old `StatsStrip` was **removed** from these three
screens (so the S5/S6/S8 StatsStrips above are no longer present in Poker/Rummy/
Go Fish — the info moved into seats, a minimal header, and a status line).
- **Poker** (`screens/PokerGameScreen.js`): seated opponents (chips/bet/fold/all-in),
  centered pot + community board, you at the bottom. Buy-in option removed from
  the variant picker earlier; poker now bets chips in-game with a flat 500-coin win.
- **Go Fish** (`screens/GoFishGameScreen.js`): seated opponents double as ask
  targets (tap a seat to choose who to ask); hand wraps into ~2 rows.
- **Rummy** (`screens/RummyGameScreen.js`): Conquián-style layout — full-width
  opponent bars showing each opponent's own melds, centered Stock/Discard piles,
  a "Your melds" zone, hand pinned at the bottom. Extras: bigger Stock/Discard
  piles rendered as real themed cards with an accent **glow** on your draw turn;
  tighter hand spacing (removed a `scale(0.92)` that reserved dead space); status
  line wraps instead of truncating; **Knock button now hidden until you can
  legally knock** (new `canRummyPlayerKnock()` export in `game/rummy.js`, defers
  to the reducer's own `canPlayerFinish` so UI and rules can't drift).

**Switchable Table Themes** (Indigo / Green / Teal felt palettes, like Last Card)
added to **Rummy, Poker, and Go Fish**. Each game has a "🎨 Table Theme" menu item
and stores its **own** choice.
- New shared pieces: `game/tablePalette.js` (a `createTablePalette(key, default)`
  factory reusing `LAST_CARD_TABLES`) and `components/TableThemePicker.js` (the
  reusable picker overlay). Per-game wrappers: `game/rummyTheme.js`,
  `game/pokerTheme.js`, `game/gofishTheme.js`. All `init*Table()` called in `App.js`.
- Defaults: Rummy + Poker = Green Felt, Go Fish = Teal. Palette colours the rail
  (background), felt surface, seats/panels, pot/ocean pill, status text, and the
  active-player accent. Action buttons keep their distinct colours on purpose.
- This fixed Rummy's low-contrast firebrick-red felt + navy-panel clash.

**Also this session:** removed the title/subtitle from the single-player Rummy
variant setup screen (`GameSetupLayout` now skips an empty title).

278 Jest tests still pass throughout. Reference commits: `38e7d66` (Poker/Go Fish
themes) back through the Rummy redesign series.

### Variant-Picker Fit + Spider Fly-Away Polish Session (2026-06-18) — COMPLETE ✅

Pure-JS UI/animation work (no native changes, no EAS build needed). All
committed on `main`. 278 Jest tests pass throughout.

**Variant pickers now fit on screen without scrolling.** Reverted an earlier
ScrollView approach in `components/GameSetupLayout.js` (back to a flex `paneStack`
that fills available space) and passed `fill` to `VariantOptionGrid` in the
Solitaire/Poker/Rummy pickers so the cards flex to share space (min/max bounded)
instead of using fixed heights that overflowed. Also dropped the in-panel
title/subtitle from the single-player Solitaire, Poker, and Go Fish pickers to
match Rummy — the nav bar already shows the game name, so the big title was
redundant and ate vertical space. (Conquián + generic `GameSetupScreen` left
as-is: no variant grid, no overflow.)

**Solitaire landscape menu fixed (again, correctly).** The earlier ScrollView
cap had been added to `components/GameHeader.js`, but Solitaire's landscape board
renders its menu via `components/GameMenuButton.js` (a Modal panel), not
GameHeader. Capped that panel to the available height and wrapped the items in a
ScrollView so the last items (e.g. **Quit**) are reachable on a short landscape
screen.

**Spider completed-run fly-away — rebuilt to fly into the Runs counter.** The
animation (in `screens/SolitaireGameScreen.js`, the spider effect ~line 549) now:
- **Targets the Runs counter pill** via `measureInWindow` on the pill + the
  tableau row (the ghosts' coordinate origin), so cards stream into where runs
  are tallied, shrinking + fading as they're "collected." Falls back to
  up-and-center if measurement isn't available. Refs: `spiderRunsPillRef`,
  `spiderTableauRowRef`.
- **Stays visible above the rail** — the tableau row is lifted over the right
  rail with `zIndex`/`elevation` (cards were disappearing under the rail).
- **Slower, nicer pace** — ~720/820ms travel, 64/70ms cascade stagger.

Three real logic bugs surfaced (and fixed) while tuning, not just cosmetics:
1. **King snapped to the column top** before flying. The ghost stack anchored to
   the topmost *removed* card in the pre-move snapshot; when the King was dragged
   in from another column that snapshot still placed it elsewhere. Fixed by
   anchoring **just below the cards that remain** in the completion column.
2. **Second run flew from the first run's spot.** `onCardLayout` never fires for
   a removed card, so its layout entry lingered in the live ref and polluted the
   next run's removed-card detection. Fixed by **pruning** layout entries for
   cards no longer on the table when snapshotting.
3. **Run flew from the source column, not the destination.** Completion column
   was picked as "most removed cards," but the moved stack can be bigger than the
   part that stayed. **Key rule: the King never moves** (a K–A run is built by
   moving lower cards onto higher ones), so its column is always the destination.
   Anchor on the King's column; old count heuristic kept only as a fallback.

Reference commits: `352daf1`/`54f20b1` (pickers), `f4b6bb3` (landscape menu),
`5dfa341`→`25c77c7` (Spider fly-away).

### Solitaire Hints — Klondike Pilot (2026-06-18) — COMPLETE ✅

Pure-JS feature (no native changes, no rebuild). Committed on `main` as
`996f3d9`. 285 Jest tests pass (278 + 7 new). Planned in plan mode first.

**Why:** Pedro asked whether hints were possible across the Solitaire games.
They are — and most of the engine already existed: `getLegalTargets(state,
source)` brute-forces candidate moves through the reducer, so it already knows
every legal move for every variant. We shipped a **Klondike-only pilot** to
prove the UX before spreading it. Behaviour: **highlight only** (glow the move,
player makes it) — Pedro's choice over auto-play.

**Engine — `getHint(state)` in `game/solitaire.js`.** Enumerates sources (waste
top + every face-up tableau card), runs each through `getLegalTargets`, and
ranks: **reveal a face-down card > advance a foundation > empty a column >
build from the waste > any other legal build.** Skips two junk categories:
pure relocations (moving a whole pile to an empty column), and any move that
would just undo the previous one (compared via a board signature against the
last `state.history` snapshot — history stores full board snapshots, not move
descriptors, so this signature compare is how we detect the inverse). Returns
`{ source, target }`, a `{ source: { type: "stock" } }` draw hint when nothing
else helps, or `null` when stuck. Klondike-only; other variants return `null`.

**UI — `screens/SolitaireGameScreen.js`.** A "💡 Hint" item in the ☰ menu
(Klondike only; uses the generic menu-item shape so `GameMenu.js` is untouched)
sets a transient `hint` state that glows the source card + destination in
**amber** (`cardTouchHint` / `tableauColumnHint`) — deliberately a different
colour from the green drag-target highlight so the two never look alike.
Clears on the next move (effect keyed on `state.moves`) and auto-clears after
4s; reduced-motion safe (static glow, no animation). All new hooks sit above
the early returns (CLAUDE.md §2.1).

**Tests:** 7 `getHint` cases in `__tests__/solitaire.reducer.test.js` — flip
priority, Ace→foundation, stock fallback, stuck→null, anti-loop, and the
variant/won guards.

**Next (deferred, not started):** FreeCell + Spider reuse the same engine almost
for free (FreeCell adds free-cells as sources/targets; Spider should rank
"completes a run" highest). Pyramid/TriPeaks are a separate, simpler "find a
matchable pair" shape. Decide after living with the Klondike pilot.

### Solitaire Hints — extended to all five variants (2026-06-18) — COMPLETE ✅

Follow-up to the pilot above (Pedro: "focus on the other solitaire games too").
Committed `39250c8`. 292 Jest tests pass (285 + 7 new). Pure JS, no rebuild.

`getHint(state)` now dispatches per variant:
- **Klondike / FreeCell / Spider** share one generalized move engine
  (`getMoveHint`): enumerate sources (waste, free cells, face-up tableau cards),
  run `getLegalTargets`, drop junk (pure relocations + any move that just undoes
  the last one, via a `boardSignature` compare against the last history
  snapshot), then pick the **highest-scoring** move. Scoring (`scoreMove`):
  complete a Spider run (1000) > flip a face-down card (500) > play to a
  foundation (300) > unload a free cell (120) > empty a column (100) > build
  from waste/free cell (60); parking in a free cell is penalized (−80). This
  replaced the Klondike pilot's ordered-pick with a score so Spider's
  run-completion can outrank everything.
- **Pyramid / TriPeaks** are tap/match games (not source→target), so they get
  dedicated finders (`getPyramidHint`, `getTriPeaksHint`) that **simulate a
  single tap** and keep it only if it actually removes a card — so a hint can
  never disagree with the real rules. Pyramid suggests an exposed card that
  pairs with the waste (sum 13) or an exposed King; TriPeaks an exposed card one
  rank from the waste top. Both fall back to a stock-draw hint, else `null`.

**UI:** the 💡 Hint menu item now shows on **every** variant, and all four extra
render functions (Spider/FreeCell/Pyramid/TriPeaks, portrait + landscape) glow
the hinted source/target — cards, columns, free cells, foundations, waste, stock
— in the same amber as the pilot. New screen helpers: `isHintFreecell`,
`isHintPyramid`, `isHintTriPeaks`.

**Note for future:** Pyramid's reducer only supports pyramid↔waste pairs and
King-alone removals (no two-pyramid-card pairing); the hint matches that on
purpose by simulating the real tap. If pyramid-pair rules ever change, the hint
follows automatically.

### Multiplayer session (2026-06-18 → 06-20) — IN PROGRESS

Three threads. All pure-JS, no rebuild; 314 Jest tests pass.

**1. Mid-game reconnect — Phase 1 (Go Fish pilot) — AWAITING DEVICE TEST.**
Most MP games silently hang when a player drops mid-game (host detects via
`onClientLeft` but doesn't resolve the missing turn). Built a pause/countdown:
new `components/ReconnectOverlay.js` + Go Fish wiring → on a drop the host
broadcasts `PAUSE` with a 60s deadline (new `PAUSE`/`RESUME`/
`GAME_OVER_DISCONNECT` messages), everyone sees the overlay, and on timeout the
game ends → Home. Piloted on Go Fish only; **needs a 2-device test before Phase 2
(reconnect handshake) and Phase 3 (per-game remove-and-continue).**

**2. How to Play → "In the App".** Added a per-game controls section (the actual
taps/drags/buttons), then **annotated gameplay screenshots**: `components/HowToShot.js`
(image + numbered dots + legend) + `IN_APP_SHOTS` in `HowToPlayScreen`. Curated
23 captured screenshots → 8 (resized 3.67 MB → 0.38 MB in `assets/howto/`), dot
positions verified against each image. Wild Round has no shot (MP-only) → text
controls.

**3. NEW GAME — "Who Am I?"** (multiplayer party game, no cards) — **the app's 9th
game.** Rotating judge **types** a secret each round; askers take turns asking
yes/no questions; judge answers Yes / No / "You got it!" (auto-credits the
asker); first to 3 round-wins. Built on the Wild Round host/judge/private-info
pattern. Files: `game/whoami.js` (+ 17 tests), `screens/WhoAmIGameScreen.js`,
lobby/App/theme wiring, `WHOAMI_SPEC.md`. The new surface is **free-text input**
(judge's secret + askers' questions). **Test bots** added (lobby `hasAI:true`) so
it's playable solo — stubs, not real reasoners (canned secrets; a bot judge
answers Yes/No simply and awards on a secret-name match or the test cheat
**`i win`**). Round-win banner (styled like the "Your Turn" banner) reveals the
word to everyone. **Plays well in solo bot testing; still needs a 3-device test
for real multiplayer.**

> ✅ Resolved 2026-06-23: CLAUDE.md + this doc now say **9 games** (Who Am I?
> added; multiplayer Blackjack screen removed).

### Multiplayer session, cont. (2026-06-20 → 06-21) — profile pics, bots, Wild Round polish

All pure-JS, no rebuild; 314 Jest tests pass throughout. **All multiplayer
changes still need device testing — none are verified on real devices.**

**4. Profile pictures across multiplayer — DONE (all 7 MP games).** New reusable
hook `components/useMultiplayerAvatars.js` + `game/avatarTransmit.js` (emoji
presets pass through; custom photos resized to 120px JPEG base64). Avatars are
exchanged **once at game start** (not per-turn) and keyed by player id; bots get
seeded presets; everything falls back to the name initial. Wired into Who Am I
(scoreboard + win banner), Go Fish, Poker, Rummy, Conquián, **Last Card**
(replaced the meaningless face-down card-back with the avatar, kept the
card-count badge), and **Wild Round** (reveal screen only). **Reason avatars are
reveal-only in Wild Round:** during `judging` the submissions are anonymous
(`anonymousSubmissions` strips `playerId`), so showing an author avatar there
would leak who wrote what.

**5. Solitaire Spider rail compressed.** Stacked Moves/Time vertically (new
opt-in `stacked` prop on `StatsStrip`) so the landscape right rail is narrower →
more board width; also tighter gaps/padding and a shorter Deal slot. Applied to
all five Solitaire variant landscape rails; the non-rail header `leftInfo` stays
side-by-side.

**6. Test bots: retired from Who Am I, enabled for Wild Round.** Who Am I plays
well, so its bot scaffolding was removed (lobby `hasAI:false`). Wild Round
**already had** a complete AI block (judge skip/keep, bot submissions, judge
pick-winner) that was dead code (gated on single-player, which Wild Round can't
launch as) — re-gated to run on the **host whenever bots are present**, with the
AI-judge check fixed to use the `isAI` flag instead of "not me" (otherwise it
would auto-drive real human clients). Lobby `hasAI:true`.

**7. Wild Round layout review + polish.** Removed the dead "Theme" menu item (it
never rendered a `TableThemePicker` and read its bg once at module load),
dropped the redundant "To Win" stat (= 10 − Score) for a static "Goal", deleted
5 unused style blocks, de-duped the byte-identical `deckCard*` styles into the
`submissionCard*` ones, and made the selected card obvious (accent border + glow
instead of a thin white line). Commits: `e712e66` (bots), `85fae35` (WR polish +
avatars), plus the avatar-rollout and Spider-rail commits.

> **Standing decision:** every commit is pushed to origin immediately (set
> 2026-06-20) — no longer gated on an explicit "push".

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

---

# 📐 Responsive Layout & Orientation Architecture

*(Merged from RESPONSIVE_LAYOUT_PLAN.md on 2026-06-04 — that file is now deleted.)*


> ⚠️ **Status (2026-06-04): orientation is now LOCKED.** This doc's original
> premise was "never force orientation, adapt to aspect ratio." That premise was
> reversed — the app is **portrait-locked everywhere except Solitaire** (which is
> landscape-locked). See the **Orientation policy** section below for the current
> rule and why. The **responsive *sizing*** guidance here (`useLayoutMode()`,
> measured width/height) is still in force and still governs scaling within the
> locked orientation — only the "free rotation / Fold-square" goal was dropped.

## Why not just force landscape? (historical rationale)

Forcing landscape was *originally* rejected — **this was reversed 2026-06-04** (see Orientation policy below). Kept here for the foldable/tablet rationale if that's ever revisited:

- **Foldables break the assumption.** A Samsung Fold unfolded is roughly square (~1:1). "Landscape = wide" isn't true there. A forced-landscape lock can look broken or waste enormous space.
- **Tablets** are often used in portrait and have plenty of room either way.
- **Forced rotation is a UX cost** — making the player physically rotate the phone, then rotate back for menus, is friction.

Instead: **measure the available space and choose a layout that fits it.** This is correct on a phone in portrait, a phone in landscape, a Fold in any state, and a tablet.

---

## The mental model: "wide mode" vs "tall mode"

Don't think in terms of "portrait/landscape." Think in terms of the **aspect ratio of the space available right now**:

- **Wide mode:** available width is meaningfully greater than height (e.g. ratio > ~1.2). Lay things out in rows; spread melds/piles horizontally; put side panels beside the play area.
- **Tall mode:** available height is meaningfully greater than width (ratio < ~0.85). Stack things vertically; play area on top, hand on the bottom.
- **Square-ish mode (the Fold case):** ratio between ~0.85 and ~1.2. Neither strongly wide nor tall. Use a balanced layout — this is the case people forget, and it's exactly the Fold. Pick whichever of wide/tall degrades more gracefully, or a dedicated balanced arrangement for the most important screens.

Thresholds are starting suggestions; tune per screen.

---

## How to detect it (React Native)

Use `useWindowDimensions()` — it updates live on rotation AND on fold/unfold, so layouts recompute automatically. Do NOT read `Dimensions.get()` once at module load (it won't update).

```js
import { useWindowDimensions } from "react-native";

function useLayoutMode() {
  const { width, height } = useWindowDimensions();
  const ratio = width / height;
  if (ratio > 1.2) return "wide";
  if (ratio < 0.85) return "tall";
  return "balanced"; // Fold / square-ish
}
```

Drive layout off `mode` (and off raw `width`/`height` for sizing). Because it's a hook reading `useWindowDimensions`, it re-runs on every dimension change — no orientation listener needed.

**Hooks-order reminder:** `useWindowDimensions()` and `useLayoutMode()` are hooks — they must be called before any early return in the component, like all other hooks (see CLAUDE.md §2.1).

---

## Orientation policy

**Current policy:**
- The app is **portrait-locked app-wide**, with **Solitaire as the sole landscape
  exception**. Solitaire locks `LANDSCAPE` on focus and restores `PORTRAIT_UP` on
  exit; the app-root lock lives in `App.js`, the override in
  `SolitaireGameScreen.js`. Both use `expo-screen-orientation` — pure JS,
  reversible, no rebuild.
- **Why the reversal:** Solitaire genuinely needs the width (7–10 tableau columns
  + long stacks); every other screen was designed portrait-first and looks worse
  forced wide. We ship **Android phone-first** to Google Play, so reworking ~21
  screens for Fold/tablet free-rotation wasn't worth it.
- **What still holds:** responsive *sizing* (`useLayoutMode()` + measured
  width/height) is unchanged and still governs how cards/columns scale *within*
  the locked orientation, so the app still adapts across phone sizes. We just no
  longer pursue arbitrary rotation or the square-ish Fold case.

*(The original "never lock orientation" policy was reversed here; `app.json` stays `"default"` but the runtime lock decides.)*

---

## Sizing cards responsively

Cards should size off the available space, not fixed pixels. `components/Card.js` already scales off `useWindowDimensions()` width with a `BASE_WIDTH` ratio clamp — extend that thinking:

- In **wide mode**, there's more horizontal room: cards can be a bit larger and spread out; fewer rows wrap; the hand may not need to scroll at all.
- In **tall mode**, vertical room is the constraint: tighter card overlap in stacked piles; the hand row may scroll horizontally.
- Compute a target card size from `min(availableWidth / cardsPerRow, availableHeight / rowsNeeded)` so cards never overflow either axis.

The win condition for "did this work": **the hand fits without horizontal scrolling whenever there's room for it.** Reducing forced scrolling is a primary goal (it also reduces the drag-vs-scroll gesture conflict — see below).

---

## Interaction with drag-and-drop

Responsive layout and the drag-and-drop fix are complementary:

- More available width → more cards fit on screen → **less horizontal scrolling needed** → fewer places where scroll-vs-drag conflict can occur.
- Drag-and-drop is **done** for Solitaire Klondike/FreeCell/Spider (landscape) with immediate touch-and-move activation (not long-press), via `components/useSolitaireDrag.js`. See CLAUDE.md §6.

---

## Rollout (done — historical)

Piloted on Solitaire, then extended: all five Solitaire variants now have
landscape layouts, and drag-and-drop landed on Klondike/FreeCell/Spider. The
other card-heavy games (Conquián, Rummy, Poker) remain candidates for a
responsive/landscape pass *if* a specific game is judged to benefit — not done
app-wide.

---

## Anti-goals (don't do these)

- ❌ Don't force a screen into landscape unless it genuinely needs it (only Solitaire does).
- ❌ Don't build two totally separate component trees for portrait vs landscape if one responsive tree can adapt — that doubles maintenance.
- ❌ Don't read dimensions once at module load; always use the live hook.
- ❌ Don't hard-code pixel card sizes that assume a specific screen.
- ❌ Don't ignore the square-ish/Fold case — it's the one most likely to look broken if you only test phone portrait + landscape.

---

## Definition of done (per screen)

- Looks correct and uses space well in: phone portrait, phone landscape, square-ish (Fold-like).
- No content overflow or clipping in any of the three.
- Cards readable; hand fits without scrolling when space allows.
- All hooks (including `useWindowDimensions`/`useLayoutMode`) are above all early returns.
- Reduced-motion still respected for any animations on the screen.
- Committed with a clear message; tested on at least phone portrait + landscape, ideally a Fold-like configuration.

---

# 🔍 Deep Code Review — Open Issues & Tracker

*(Merged from DEEP_REVIEW.md on 2026-06-04 — that file is now deleted.)*


> **Fresh full-structural sweep** after the animation work. The v2 doc is fully resolved
> and was archived as `DEEP_REVIEW_v2_archive.md` (since deleted — all items resolved).
>
> This review covers: bugs + code quality + UX + performance + accessibility +
> app-store readiness — same wide scope as v2, with full beginner-friendly
> walkthroughs.

---

## How to use this file

- Each item has a unique ID (e.g. `BUG-1`, `LAUNCH-1`)
- Check off `- [ ]` → `- [x]` as you complete items
- Items grouped by category, then ordered by priority within each category
- Each item explains the what / why / fix, beginner-friendly

---

## ✅ Progress Tracker

### 🚨 LAUNCH-BLOCKING

- [x] **LAUNCH-1** — Privacy policy file hosted at `https://hardrockpdc.github.io/card-game-app/privacy.html` (docs/privacy.html committed to main; GitHub Pages must be enabled in repo Settings → Pages → main branch /docs folder — pending that one-time manual step)
- [ ] **LAUNCH-2** — EAS production build pending — required for the iOS permission descriptions added in v2 to take effect on real devices

### 🐛 BUGS (real or likely)

- [x] **BUG-1** — RESOLVED (verified 2026-06-02). `MultiplayerGameScreen.js` now uses the new layout (`styles.section` + `styles.label` + `styles.hand` + `handWidth`); the old boxed-section styles (`sectionActive`/`sectionHeader`/`sectionName`/`sectionValue`/`handRow`/`actionRow`) are gone. Code parity confirmed; a device glance is still worthwhile but the v3 claim is no longer true.
- [x] **BUG-2** — Audited all 9 game screens for hooks-after-early-return (2026-06-01). Only `WildRoundGameScreen` was affected; fixed in commit `9bd069a`. All other screens place every hook above every early return.
- [x] **BUG-3** — RESOLVED (verified 2026-06-02). `stopBroadcasting()` now runs in the lobby's unmount cleanup (`return () => stopBroadcasting()`), the Start-Game path, and the quit/back path. The broadcast no longer survives leaving the lobby.
- [x] **BUG-4** — Auto-save throttle added to Rummy, GoFish, Poker, LastCard (same lastSaveRef 3s gate as Conquián). Commit `5748463`.
- [x] **BUG-5** — N/A: Wild Round is multiplayer-only (removed from single-player carousel). No save/resume needed.
- [x] **BUG-6** — ✅ FIXED (commit `734dae9`, was **high**) — added a per-connection receive buffer to both TCP handlers in `GameNetwork.js` so messages larger than one segment reassemble instead of being silently dropped. Verify on two devices in a Poker/Conquián game.

### ⚡ PERFORMANCE

- [x] **PERF-1 / PERF-2 — NOT a real startup issue (investigated 2026-06-18).**
  The "loads 7 themes × 53 images / 109 images at startup" framing was a
  misconception: in React Native a static `require('img.png')` is a **build-time
  asset reference (a number)**, not a runtime load. Confirmed there is **no**
  `prefetch` / `loadAsync` / `Asset.fromModule` anywhere — images load lazily
  per-`<Image>` on render. Evaluating `cardTheme.js`/`lastCardTheme.js` just
  builds small objects of numbers (trivial). Splitting per-theme (CQ-6/CQ-5)
  wouldn't change startup. The real lever was app **download size**, not startup
  time — see the joker fix below.
- [x] **App-size win (2026-06-18, `fa0514c`).** Each theme's `joker.png` shipped
  at 600×840 (3× the 200×280 of every other card) and 300–913 KB each — ~4 MB
  for 7 images that render at normal card size. Downscaled to 200×280 to match
  the deck: **3.96 MB → 0.20 MB**, no visible change. Repro:
  `scripts/resize-jokers.js`. (Card PNGs are otherwise already well-optimized at
  ~15 KB.)
- [x] **Thumbnail app-size win (2026-06-18, `b497b7a`).** The 7 carousel/setup
  thumbnails (`assets/images/thumb_*`) were opaque 900×1200 illustrations. They
  are **correctly sized** (the setup carousel renders ~`width*0.78` × 3× DPI ≈
  900px), so downscaling would soften them — instead switched format **PNG →
  JPEG q85** (PNG is wasteful for photographic content): **2.41 MB → 0.84 MB**,
  no visible change. Updated require paths in `HowToPlayScreen` +
  `SinglePlayerSetupScreen`; repro `scripts/convert-thumbnails.js`. With the
  joker fix, total assets are now ~12 MB (was ~17 MB).
- [x] **PERF-3 — MOOT (2026-06-18).** It was about `MultiplayerGameScreen`
  (multiplayer Blackjack) over-broadcasting. Multiplayer Blackjack has since been
  removed from the flow — the lobby only offers Conquián/Poker/Rummy/Wild Round,
  and **nothing navigates to the `"MultiplayerGame"` route**. The screen is now
  orphaned dead code (only referenced by its own `App.js` import + Stack.Screen
  registration). Single-player Blackjack (`GameScreen.js`) is unaffected.
  **Dead screen removed 2026-06-18 (`5ff6676`)** — deleted
  `screens/MultiplayerGameScreen.js` (~600 lines) + its `App.js` import and
  Stack.Screen registration. Recoverable from git history if ever revived.

### ♿ ACCESSIBILITY

- [x] **ACC-1** — Wild Round pagination dots + Spider fly-away ghosts now hidden from screen readers (decorative; the "X / Y" counter already announces position). Commit `79bc656`.
- [x] **ACC-2 — DONE 2026-06-23 (`80e2850`), pending device test.** Hand container in `RummyGameScreen` + `ConquianGameScreen` is hidden from screen readers during the fresh-deal animation, then re-revealed. Uses a **state flag** (`handReady`) — not the ref the old recipe wrongly specified — so the re-reveal actually re-renders. Fail-safe: defaults to `true`, set `false` only on a fresh deal, with a guaranteed 1400ms `setTimeout` re-reveal (timer cleared on unmount); a missed re-reveal can never permanently hide the hand. Cross-platform (`accessibilityElementsHidden` iOS + `importantForAccessibility` Android). **Not yet verified with TalkBack/VoiceOver on a device.**

### 🎨 UX POLISH

- [x] **UX-1** — CardThemeScreen accent swapped to `#7fb3ff` blue (dot + "Use This Theme" button); button uses dark text for contrast, dimmed state recolored. Commit `aeeca46`.
- [x] **UX-2** — Blackjack result-modal delay now conditional: 2s only when the dealer actually plays, 600ms on an instant bust / natural blackjack. Commit `fd37a71`.
- [x] **UX-3 — NOT reproducible (investigated 2026-06-18).** The app uses a
  **native-stack** navigator, which keeps the underlying game screen mounted when
  How-To-Play (or any screen) is pushed on top, so returning does **not** remount
  it. The deal is mount-gated (the per-screen init effect runs once; no game
  re-deals on focus), and the resume-from-save path already suppresses the deal
  via `hasMountedRef`. So closing How-To-Play can't replay the deal. Speculative
  review note ("can cause re-mount") that doesn't hold in the current navigator.
- [ ] **UX-4** — No visual "loading" or "dealing" state during the 50ms `hasMountedRef` delay — usually invisible, occasionally noticeable

### 🧹 CODE QUALITY (carried forward from v2)

> **CQ triage 2026-06-18.** Worked through the whole list. Several were already
> satisfied or moot; the rest split into "can't verify safely" (multiplayer /
> network / 160 mixed-type id sites — a regression there is invisible without a
> two-device setup) and "low-value churn" (cosmetic refactors that add risk for
> no user benefit). Did the genuinely safe + valuable ones; deferred the rest
> with per-item reasoning. Available on request if the value/risk is accepted.
>
> **Codebase scan 2026-06-19 (post-CQ).** Swept for missed issues: no orphaned
> refs to removed features, all screens registered in `App.js`, no TODO/FIXME
> markers, the only `console.log` is the `game/logger.js` dev util, no unused
> `game/` modules, working tree clean, all 78 source files parse clean, no
> hooks-after-early-return (one heuristic flag was a false positive across a
> helper-fn boundary). **Found + removed dead code:** `RummyVariantWheel`,
> `SolitaireVariantWheel`, `VariantPicker` (leftover from the picker redesign;
> ~166 lines, commit `f09bfd8`); `PokerVariantWheel` stripped to its still-used
> `POKER_VARIANT_OPTIONS` constant.

- [ ] **CQ-1 — DEFERRED.** Extract `useMultiplayerGame` hook. Big refactor of
  shared multiplayer state; un-verifiable without two devices. High risk.
- [ ] **CQ-2 — DEFERRED.** "Centralize game registry": the three lists
  (`LobbyScreen` = 6 multiplayer games, `HowToPlayScreen` = all 7,
  `SinglePlayerSetupScreen` = single-player set) are genuinely **different sets
  with different fields**, and ids are inconsistently cased (`goFish`/`wildRound`
  vs `gofish`/`wildround`). A naive merge risks changing what appears where and
  breaking nav/matching. Reconciling the casing first would be the valuable part,
  but it's risky to do blind. Low value for a solo shipper.
- [ ] **CQ-3 — DEFERRED.** "Magic numbers → config.js": no `config.js` exists;
  the scope is sprawling and subjective with no crisp target. Low value.
- [x] **CQ-4 — MOOT (2026-06-18).** Multiplayer Blackjack was removed this
  session (`5ff6676`), so there's no MP Blackjack logic left to extract.
  Single-player Blackjack (`GameScreen.js`) uses `calculateHandValue` from
  `game/deck.js`, which is already in the logic layer.
- [x] **CQ-5 — DONE 2026-06-18 (`73e91d6`).** Extracted the 109-image LastCard
  map to `game/lastCardImages.js`; `LastCardGameScreen.js` imports it. Screen
  dropped ~110 lines. The `../assets` paths resolve identically from `game/` and
  `screens/`, so requires moved verbatim. No behavior change.
- [ ] **CQ-6 — DEFERRED (low value).** `cardTheme.js` is already an isolated
  theme module; splitting it into 7 per-theme files + an index that re-imports
  them all is pure file-count churn with no functional benefit (the requires are
  build-time asset refs either way), and a mistyped path would silently break a
  theme. Not worth the risk.
- [ ] **CQ-7 — DEFERRED.** `LobbyScreen` handler closure stale-state risk — a
  real concern, but it's multiplayer-lobby code; un-verifiable without two
  devices. Worth doing alongside a device test session.
- [ ] **CQ-8 — DEFERRED.** Standardize `String(id)` vs raw-id comparisons: ~160
  comparison sites across game logic **and** multiplayer, where ids are
  deliberately mixed types (numeric `clientId` vs string player id). Blind
  normalization is high-risk (could break turn/seat matching) and needs
  two-device testing. Not safe to ship untested.
- [x] **CQ-9 — SATISFIED (verified 2026-06-18).** All 18 screens already use
  `SafeAreaView` from `react-native-safe-area-context` (zero use the wrong
  `react-native` one). `KeyboardAvoidingView` is used only in the two text-input
  screens (`JoinScreen`, `HostSetupScreen`), which is appropriate. Nothing to fix.
- [x] **CQ-10 — DONE 2026-06-18 (`<this commit>`).** The `lastCard.js` action
  functions (`applyCard`/`drawCard`/`chooseColor`) already build new state via
  spreads and never mutate input; added purity tests in
  `__tests__/lastCard.actions.test.js` (deep-compare input before/after) to lock
  it in. 297 tests pass.
- [x] **CQ-11 — RESOLVED (verified 2026-06-18).** No Conquián references remain
  in `RummyVariantPickerScreen` — the half-wired state is gone.
- [ ] **CQ-12 — DEFERRED.** Network message-shape inconsistencies — networking
  code; un-verifiable without two devices.
- [x] **CQ-13** — Removed the unused `typescript` dependency. Commit `3eb638a`.
- [x] **CQ-14** — ✅ RESOLVED (commit `ba929a5`). Game saves now carry a `SAVE_VERSION` wrapper; a shared validator (used by `loadGame` *and* `hasSave`) discards saves that are missing/corrupt/incompatible-version and wipes them, so an outdated shape starts fresh instead of crashing the screen, and the resume prompt stays consistent. Legacy unwrapped saves treated as v1. Tested.

### 🚀 IMPROVEMENTS (post-launch)

- [ ] **IMP-1** — `__DEV__` debug overlay
- [~] **IMP-2** — Jest tests for game logic. Lean app-decoupled Jest setup (`npm test`). **368 tests across 27 suites as of 2026-06-23** (started at 150 on 2026-06-01/02). Covers all pure-logic modules (deck/blackjack, poker, conquian, rummy, lastCard, solitaire, gofish, wildround, whoami) **plus** several reducers (`solitaire.reducer`, `rummy.reducer`, `conquian.transitions`), AI move selection (`ai-pickers`, `poker.ai`), `gameSaves`, `wallet`, and `profile`. Still not covered: `GameNetwork` (TCP/UDP — needs a two-device harness) and the React screen components themselves.
- [ ] **IMP-3** — Remote-loadable wildround cards (OTA content updates)
- [ ] **IMP-4** — Centralized round-over helper
- [ ] **IMP-5** — "Quick Match" button on Home
- [ ] **IMP-6** — Dev-mode tools screen
- [ ] **IMP-7** — Schema versioning for saves
- [ ] **IMP-8** — Card move animation (the spec's recipe #3, still not implemented)
- [x] **IMP-9 — DONE 2026-06-18 (`3ffb20c`).** Was actually wired back in
  `fed70fd` (animateReveal + FlipCard) but never fired — a face-down card had no
  drag gesture so `CardSlot` returned a bare Pressable, then gained a gesture
  once face-up and returned a `<GestureDetector>` wrapper instead. The changing
  root element type remounted the Card, so the flip never saw the true→false
  transition (it popped face-up). Fixed by always wrapping in a GestureDetector
  (stable disabled Tap gesture when not draggable) so the Card instance persists
  through the uncover and the 260ms flip plays.

---

# 🔎 v4 Review pass (2026-06-04)

Scope: focused static review of the highest-risk code — the network layer
(`GameNetwork.js`) and the pure game-logic modules (`gofish`, `lastCard`,
`conquian`, plus spot-checks of the others), leaning on this session's extensive
reading of the screens. **Not** an exhaustive line-by-line of all ~28k lines —
the large game-screen files (`RummyGameScreen`, `PokerGameScreen`,
`ConquianGameScreen`, `WildRoundGameScreen`, `LastCardGameScreen`, ~7k lines)
warrant a dedicated follow-up pass. The codebase is mature (v3-reviewed), so few
new bugs surfaced. Findings grouped as requested:

### Group 1 — fixable without approval (DONE this pass)

- [x] **NB-1** — `GameNetwork` `broadcastToClients`/`sendToClient`/`sendToHost`
  called `socket.write()` unguarded. A socket mid-close (a client that just
  disconnected) can throw; in `broadcastToClients` the `forEach` would abort, so
  the *remaining* clients silently miss that message → desync. Fixed with a
  `safeWrite()` try/catch wrapper.
- [x] **NB-2** — `pickGoFishAIMove` would throw on an empty hand
  (`hand[…].rank` / `Object.entries(counts)[0][0]`). The screen already guards
  `hand.length === 0`, so it's defensive only — added an early `return null`.

### Group 2 — need your verification (ideally on device / two devices)

- [ ] **CQ-8** (carry-forward) — numeric `clientId` (from `nextClientId++`) vs
  string `player.id`. The pure logic wraps everything in `String(...)` so it's
  mostly safe, but raw comparisons in the multiplayer screens should be audited;
  verify turn-taking with mixed id types across two devices.
- [x] **NB-4** — Follow-up pass over the big game-screen files
  (Rummy/Poker/Conquián/Wild Round/Last Card) **complete**: structurally sound —
  hooks are all above the render guards (Wild Round even carries an enforcing
  comment), every screen is null-safe on first render (explicit `if (!gameState)`
  guards, or optional chaining in Last Card), and network listeners/effects have
  cleanup. No new bugs found; the deeper risks remaining are the multiplayer
  runtime behaviors (CQ-8 / PERF-3) that need two devices.
- [ ] **PERF-3** (carry-forward) — multiplayer broadcasts the full state on every
  action; verify responsiveness with two devices before optimizing.
- [x] **NB-3** — ✅ FIXED. The server/client `data` handlers used to call
  `listeners.onMessage()` *inside* the parse `try/catch`, silently swallowing
  handler exceptions. Now only the `JSON.parse` is caught (a partial/garbage line
  on the byte stream is skipped); the handler runs in its own guard that logs via
  `warn()` instead of swallowing — real handler bugs surface in dev logs without
  crashing the read loop. No handler relied on the swallow.
- [ ] **UX-4** (carry-forward) — optional brief "dealing…" state during the mount
  delay. Confirm it's wanted.

### Group 3 — need a new EAS build

- [x] **Dev build landed & verified 2026-06-04** — immersive bars, the
  `expo-screen-orientation` native module, gesture-handler (drag-and-drop), and
  the smaller APK are all live. Orientation policy has since shifted (pure-JS,
  no rebuild): the app is now **portrait-locked except Solitaire** (landscape) —
  see `EAS_REBUILD_PENDING.md` / `RESPONSIVE_LAYOUT_PLAN.md`.
- [ ] **LAUNCH-2** (production build) — still pending; separate workflow.

---

# 🚨 LAUNCH-BLOCKING

These two items are the only things between you and a working App Store / Google Play submission.

---

## LAUNCH-1. Privacy policy file ✅ RESOLVED (2026-06-23)

`docs/privacy.html` committed to main. **One manual step remaining:** Enable GitHub Pages in repo Settings → Pages → Source: main branch, /docs folder → Save. Once done, `https://hardrockpdc.github.io/card-game-app/privacy.html` will be live within ~1 minute.

**Effort:** 15 minutes
**Risk if ignored:** **App Store will reject the submission** — they tap the privacy policy URL and get a 404.

### What was happening

Back in DEEP_REVIEW v2 we set the URL `https://hardrockpdc.github.io/card-game-app/privacy.html` in `screens/AboutScreen.js` and `APP_STORE_REVIEW_NOTES.md`. The URL was wired in code, but the file didn't exist. Now resolved — see `docs/privacy.html`.

When the App Store reviewer taps "Privacy Policy" in your app, the browser opens that URL and gets a "Page Not Found." That's an automatic rejection.

### Why this is the highest-priority remaining item

Of everything in this doc, this is the only item that will definitely cause a rejection. Everything else is internal quality. Solve this before submitting.

### The fix (manual, outside Claude Code)

Three options ranked by simplicity:

**Option A — GitHub Pages (recommended — free, easy):**

1. In your project repo, create a new file at the root: `docs/privacy.html`
2. Paste a basic privacy policy. Below is a complete template you can drop in as-is — no-tracking apps don't need much.
3. Enable GitHub Pages: Repo → Settings → Pages → Source: `main` branch, `/docs` folder → Save
4. Wait ~1 minute for Pages to deploy
5. Visit `https://hardrockpdc.github.io/card-game-app/privacy.html` in a browser to confirm it loads

**Privacy policy template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Card Night — Privacy Policy</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #222; }
    h1 { color: #1a1a2e; }
    h2 { color: #2c3e50; margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>Card Night — Privacy Policy</h1>
  <p><strong>Last updated:</strong> June 23, 2026</p>

  <h2>What we collect</h2>
  <p>Card Night does not collect, store, or transmit any personal data to any server.</p>

  <h2>What's stored on your device</h2>
  <p>All gameplay data — your profile name, photo, coin balance, game statistics, and saved games — is stored only on your device using your device's local storage. None of this data leaves your device.</p>

  <h2>Camera and photo library</h2>
  <p>If you choose to set a profile photo, Card Night uses your camera or photo library only at the moment you tap that option. The photo is stored only on your device.</p>

  <h2>Local network</h2>
  <p>Card Night uses your local Wi-Fi network only for direct device-to-device multiplayer. No third-party servers are involved. No data is logged or shared.</p>

  <h2>Third parties</h2>
  <p>Card Night contains no third-party analytics, advertising networks, or tracking SDKs.</p>

  <h2>Children</h2>
  <p>Card Night does not collect data from any user, including children under 13.</p>

  <h2>Changes to this policy</h2>
  <p>If this policy changes, the updated version will be posted at this URL.</p>

  <h2>Contact</h2>
  <p>Questions? Open an issue at <a href="https://github.com/hardrockpdc/card-game-app/issues">github.com/hardrockpdc/card-game-app/issues</a>.</p>
</body>
</html>
```

> The wording matches what Apple/Google look for: who you are, what you collect, where it's stored, who it's shared with (nobody), and how to contact you. Vague policies get rejected; this one is specific.

**Options B and C** (Netlify Drop / a static hosting service) work too — anywhere the URL doesn't change is fine.

---

## LAUNCH-2. EAS production build pending

**Effort:** 30-90 minutes (depending on whether you've used EAS before)
**Risk if ignored:** The iOS permission descriptions from v2 (NSCameraUsageDescription, NSPhotoLibraryUsageDescription) live in `app.json`, but they don't take effect on real devices until you produce a fresh native build. Without a new build, an iOS user who tries to take a profile photo will hit the **old** binary without the description and crash.

### What's happening

`app.json` config changes (especially `infoPlist` keys) get compiled into the iOS binary at build time. Your current TestFlight / development build was made before we added the camera permission descriptions, so it's missing them in its `Info.plist`.

Per PROJECT_NOTES.md, this is already on your "Still to do before EAS production build" list. It's the actual final step before submission.

### Why this matters

- iOS will crash hard on any code path that triggers `NSCameraUsage` without a description
- The build is what gets submitted to the App Store, not the JavaScript bundle alone
- Until you re-build, the JS changes since the last build are running on an older native layer

### The fix (separate workflow)

This is its own multi-step process outside Claude Code:

1. Install EAS CLI if you haven't: `npm install -g eas-cli`
2. `eas login` (with your Expo account)
3. `eas build:configure` (first time only — creates `eas.json`)
4. `eas build --profile production --platform all`
5. Wait 10-20 min for the cloud build
6. Download the resulting .ipa (iOS) and .aab (Android) files
7. Upload to App Store Connect / Google Play Console

I can walk through any individual step if you want — just ask.

---

# 🐛 BUGS

Real or likely problems in the code. Listed in order of risk.

---

## BUG-1. MultiplayerGameScreen.js still has the OLD layout (Session A code didn't actually land)

**Effort:** 30 minutes (re-run Session A)
**Risk if ignored:** Multiplayer Blackjack screen looks broken / inconsistent with single-player. Doesn't crash, but the visual parity we did in v2's "Session A" is missing.

### What's happening

When we did the "make multiplayer Blackjack look like single-player" work, the project knowledge later showed both Session A code AND Session B (animations) code as committed. Today's resync shows something different: **the styles in `MultiplayerGameScreen.js` are still the OLD ones** — `styles.section`, `styles.sectionActive`, `styles.sectionHeader`, `styles.handRow`, `styles.activeHandBorder`, `styles.actionRow`, etc. These are the styles Session A was supposed to remove.

Specifically, the render still has:

```javascript
<View style={[styles.section, isCurrent && styles.sectionActive]}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionName}>...</Text>
    <Text style={styles.sectionValue}>...</Text>
    ...
```

This is the pre-Session-A code. Session A was supposed to replace this with:

```javascript
<View style={styles.section}>
  <Text style={styles.label}>...</Text>
  <View style={[styles.hand, { width: handWidth }]}>
```

Two reasonable explanations:

1. The Session A commit happened on a different branch and didn't reach main
2. The styling refactor was reverted by a later commit
3. Project knowledge was stale at the time and we never actually confirmed the visual

I see `useWindowDimensions` and `handWidth` ARE present (those were from Session A), so SOME of Session A landed. But the JSX restructure didn't.

### Why this matters

Multiplayer Blackjack visually looks worse than single-player, and you specifically asked for parity. The animations (Session B) DID land — there are `hasMountedRef`, `computePlayerDealDelay`, `computeDealerDealDelay`, and `animateDeal` props on Card. So animations work, but on the old "boxed sections" layout.

### The fix

Re-run the Session A prompt. The prompt is in our chat history (the one titled "refactor: multiplayer Blackjack visual + UX parity with single-player (Session A)"). The Card render structure to add `animateDeal` / `dealDelay` props to is now slightly different from what that prompt expected, since Session B landed first. We'll need a careful Session A re-run that preserves the Session B animation wiring.

Lower-risk path: a single combined prompt that does the Session A JSX refactor AND preserves the existing `hasMountedRef` / `dealDelay` props on the new Card elements.

---

## BUG-2. UX-5 BackHandler useEffects placed AFTER early returns in some game screens

> **✅ RESOLVED 2026-06-01.** Full hooks-order audit run across all 9 game screens
> (KICKOFF Task 0.5). Result: only `WildRoundGameScreen` had a misplaced hook — its
> UX-5 BackHandler `useEffect` sat *after* the `if (!gameState)` loading guard, which
> crashes on entry because `gameState` starts null and is filled in async. Moved the
> effect above the guard (commit `9bd069a`). Every other game screen — Conquián, Rummy,
> Go Fish, Poker, Multiplayer Blackjack, single-player Blackjack — places all hooks above
> all early returns. Solitaire and Last Card have no null-state early return at all, so
> they're structurally immune. The remaining detail below is kept for historical context.

**Effort:** 30 minutes total (audit + fixes)
**Risk if ignored:** Same crash pattern that hit Poker recently — "Rendered more hooks than during the previous render"

### What's happening

When we did the UX-5 BackHandler sweep in DEEP_REVIEW v2 (Polish Bundle), the useEffect was added to many game screens. Several of those screens have a `loading` / `gameState === null` early return. Looking at the actual code now:

- **PokerGameScreen.js** — fixed last week, comment "must be before early returns" confirms it ✅
- **RummyGameScreen.js** — `hasMountedRef` useEffect placed after the network listener block. **Need to verify the UX-5 BackHandler useEffect placement.**
- **ConquianGameScreen.js** — `hasMountedRef` is before any early return ✅. Need to verify UX-5.
- **GoFishGameScreen.js** — similar pattern, need to verify UX-5.
- **LastCardGameScreen.js** — its main useEffect (`init`) does early-return `if (!isHost) return`. Need to verify UX-5 placement.
- **WildRoundGameScreen.js** — need to verify UX-5.
- **GameScreen.js** (single-player Blackjack) — the UX-5 useEffect is placed before the early `if (screenPhase === "betting") return ...`. **Actually wait** — looking again, GameScreen's only early return is `if (screenPhase === "betting") return (...)` which is the rendering fork at the bottom of the component, AFTER all useEffects. So GameScreen is safe.
- **MultiplayerGameScreen.js** — same as Conquián, UX-5 is before the loading early return ✅
- **SolitaireGameScreen.js** — UX-5 placement needs verification.
- **LobbyScreen.js** — no early returns for null state, so safe.

### Why this matters

Any screen where the UX-5 useEffect lives after an `if (something) return ...` is a future crash waiting to happen — the same way Poker crashed. The Poker crash already happened to you; the others are dormant.

### The fix

Audit each of the 9 game screens. For each one:

1. Find every `useEffect` in the component
2. Find every `if (...) return ...` early-return statement
3. Confirm EVERY useEffect appears BEFORE EVERY early return

If any useEffect is misplaced, move it up. Same fix we did for Poker.

> Note: This is a pure correctness audit. No new features, no styling changes. The goal is "all hooks before all returns, always." Once done, you've eliminated this whole class of bug across the app.

---

## BUG-3. LobbyScreen broadcast keeps running when navigating to a game

**Effort:** 5 minutes
**Risk if ignored:** Same family of issue as v2's BUG-5 (UDP broadcast keeps running after game starts), but for the case where the lobby is left via a non-tap path

### What's happening

`LobbyScreen.js` has a host-side useEffect that returns `() => stopBroadcasting()` as cleanup. That cleanup fires when the lobby unmounts. **BUT** the start-game flow uses `navigation.replace(game.screen, ...)` — React Navigation may keep the previous screen mounted in some cases (especially with stack screens that have `freezeOnBlur` set or animations in progress).

We previously addressed the explicit "Start Game" path by calling `stopBroadcasting()` directly in `handleStartGame`. So that path is now belt-and-suspenders covered. But there are still other ways out of the lobby (Android back, navigation.goBack, etc.) where the cleanup might or might not fire reliably.

This is mostly belt-and-suspenders — the fix is to call `stopBroadcasting()` defensively in the `handleQuit` and BackHandler paths as well, not just in `handleStartGame`.

### Why this matters

If broadcast keeps running after the lobby is gone, other phones nearby see a "Pedro's game" entry that doesn't accept new joins. Minor but confusing for users.

### The fix

In `LobbyScreen.js`, look for the `handleQuit` / leave-lobby paths and the UX-5 BackHandler's "Leave" onPress. In each, add `stopBroadcasting()` before navigation. If `stopBroadcasting` is idempotent (which it is — internal `broadcastSocket` becomes null after first call), calling it multiple times is fine.

---

## BUG-4. Auto-save throttle missing in multiple game screens (Conquián already fixed)

**Effort:** 5 minutes
**Risk if ignored:** Battery and performance impact on long games — every meld, every pass, every selection writes to AsyncStorage

### What's happening

**Conquián is already fixed** — `ConquianGameScreen.js` has a `lastSaveRef` 3-second throttle in place (confirmed via code inspection, lines 255-265).

The un-throttled pattern still exists in:
- `RummyGameScreen.js` (auto-save fires on every `gameState` change)
- `GoFishGameScreen.js` (auto-save fires on every `gameState` change)
- `PokerGameScreen.js` (auto-save fires on `[gameState, tournamentWinner]`)
- `LastCardGameScreen.js` (auto-save fires on every `gameState` change)

### Why this matters

Solitaire's PERF-3 fix made it noticeably snappier on Android. The same throttle pattern would benefit the other games. Conquián is the worst offender because of how often the state mutates during meld preview.

### The fix

Apply the same `lastSaveRef` throttle to each game's auto-save effect:

```javascript
const lastSaveRef = useRef(0);

useEffect(() => {
  if (!isSinglePlayer || !fullRef.current) return;
  if (gameState?.phase === "results") {
    clearGame(SAVE_KEY_CONQUIAN);
    return;
  }
  const now = Date.now();
  if (now - lastSaveRef.current < 3000) return;
  lastSaveRef.current = now;
  saveGame(SAVE_KEY_CONQUIAN, { fullState: fullRef.current });
}, [gameState]);
```

Apply to all 5 games. ~5 min per file, all the same pattern.

> Edge case: when a user explicitly hits "Save & Exit", we want a guaranteed save (not throttled). For now this is fine since "Save & Exit" goes through `handleSaveAndExit` which already calls `saveGame` directly, bypassing the throttle's useEffect.

---

## BUG-5. ~~WildRound has no save/resume~~ — N/A

> **✅ CLOSED (2026-06-17).** Wild Round is multiplayer-only — it was removed from
> the single-player carousel intentionally. Save/resume doesn't apply to a
> multiplayer party game session.

---

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

---

# ⚡ PERFORMANCE

---

## PERF-1. cardTheme.js loads 7 themes × 53 images at startup

**Effort:** 30-60 minutes (combined with CQ-6)
**Risk if ignored:** Slower cold-start launch on low-end Android, ~50MB+ peak memory baseline

(Carried over unchanged from v2 — this is genuine work that's still pending. The fix recipe is in v2; same approach applies.)

---

## PERF-2. LastCard ships 109 images in a single inline module

**Effort:** 15 minutes (combined with CQ-5)
**Risk if ignored:** Slow LastCard mount, ~7MB images held in memory while LastCard is open

(Carried over unchanged from v2.)

---

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

---

# ♿ ACCESSIBILITY

---

## ACC-1. Wild Round carousel dots + Spider fly-away ghost cards have no a11y labels

**Effort:** 10 minutes
**Risk if ignored:** Minor — screen-reader users hear silence in those regions

### What's happening

Two areas missed in the v2 accessibility sweep:

1. **Wild Round carousel dots** — they're pagination indicators (the spec explicitly says "carousel pagination, not turn indicators") so they don't need a state label, but they could benefit from `accessibilityRole="adjustable"` so screen readers announce them as carousel position.

2. **Spider fly-away ghost cards** — these are decorative-only animated overlays. They should be `accessible={false}` to prevent screen readers from focusing on cards that are flying off the screen.

### Why this matters

Not a real barrier — both are minor polish items. Mentioned here for completeness.

### The fix

In `WildRoundGameScreen.js`, find the carousel dots render and add `accessibilityRole="adjustable"` plus an `accessibilityLabel` like `"Card ${index + 1} of ${cards.length}"`.

In `SolitaireGameScreen.js`, find the fly-away ghost cards render (the `spiderFlyAwayCards.map(...)`) and add `accessibilityElementsHidden={true}` and `importantForAccessibility="no-hide-descendants"` to the wrapper.

---

## ACC-2. Deal animation may interfere with screen reader focus on rapidly-mounting cards

> **✅ RESOLVED 2026-06-23 (`80e2850`) — pending device test.** Implemented in
> `RummyGameScreen.js` + `ConquianGameScreen.js` with a `handReady` **state flag**
> (fail-safe default `true`; hidden only during the fresh deal; guaranteed 1400ms
> re-reveal timer). See the tracker entry above. The original "The fix" recipe
> below is **wrong** (it keys off `hasMountedRef`, a ref — no re-render — so the
> hand would never un-hide); kept only to show what NOT to do. Still needs a
> TalkBack/VoiceOver pass on a real device.

**Effort:** 15 minutes
**Risk if ignored:** Screen-reader users may have their focus jump around or get lost when cards animate in (especially Rummy's 10-card deal)

### What's happening

When Rummy's initial deal happens, all 10 cards mount at staggered times (0ms, 100ms, ... 900ms). Each card has an `accessibilityLabel` from ACC-2 (DEEP_REVIEW v2). VoiceOver / TalkBack might:
- Lose focus as cards appear
- Announce cards as they slide in, creating audio overlap
- Get stuck on a card that's in mid-animation

### Why this matters

For a sighted user the animation is nice. For a blind user, "Five of clubs. Three of diamonds. Jack of hearts. Eight of spades..." rapid-fire could be confusing.

### The fix

Add `accessibilityElementsHidden={!hasMountedRef.current}` to the hand container. This tells screen readers "ignore this region during the initial deal animation; reveal it once the animation completes." After the 50ms `hasMountedRef` timer fires, the region becomes accessible normally.

This is a minor tradeoff — screen reader users have a tiny delay before they can navigate the hand, but the hand is then stable and announceable in any order. Much better UX than a moving target.

---

# 🎨 UX POLISH

---

## UX-1. CardThemeScreen still uses red accent

**Effort:** 5 minutes
**Risk if ignored:** Visual inconsistency with the rest of the app post-UX-3 sweep

### What's happening

DEEP_REVIEW v2's UX-3 standardized `#e94560` red spinners to `#7fb3ff` blue across the app. `CardThemeScreen.js` was missed — its theme-selection accent (the active dot, the Apply button, the confirmed-state colors) are all still red.

### Why this matters

When you open Profile → Card Theme, the screen visually clashes with the rest of the polished UX. Tiny issue but jarring.

### The fix

Find every `#e94560` in `CardThemeScreen.js` (excluding the actual card theme color swatches — those are theme content) and replace with `#7fb3ff`. Or just verify each one — if it's a structural UI element, swap it; if it's content (e.g. a theme preview), leave alone.

---

## UX-2. Result modal delay fires even when there's no dealer reveal to wait for

**Effort:** 10 minutes
**Risk if ignored:** Slight feels-laggy moment on hands that don't reveal the dealer (player bust before stand)

### What's happening

In `GameScreen.js` we added a 2000ms delay before showing the result modal so the dealer flip animation has time to play. That delay was perfect for the "you stand → dealer reveals" path.

But it ALSO fires for paths where there's no flip:
- Player busts on their hit → result is immediate, but modal still waits 2s
- Player gets natural blackjack → modal still waits 2s
- Adjust Bet returns to betting phase → already handled by the cancel

### Why this matters

A bust feels like the modal is slow. The animation reason isn't visible to the user — they just see a delay.

### The fix

Make the delay conditional. If `showFullDealerHand` is false at the moment of `resolveHandPayout` (meaning we're not going to do the dealer reveal — player bust, natural blackjack, etc.), use a shorter delay (~400ms) or no delay. Only delay 2s when we're showing the dealer reveal sequence.

Pseudocode:

```javascript
const needsFlipDelay = (
  result !== "blackjack" &&
  gameStatus === "finished" &&
  showFullDealerHand
);
const delayMs = needsFlipDelay ? 2000 : 400;

modalDelayTimerRef.current = setTimeout(() => {
  setScreenPhase("result");
}, delayMs);
```

The 400ms small delay still feels deliberate (not a "snap to modal") but doesn't drag.

---

## UX-3. Deal animation re-plays after closing How To Play (or any nav)

**Effort:** 15 minutes
**Risk if ignored:** Slightly weird visual — you close the tutorial overlay, and your cards re-animate in from above

### What's happening

When you navigate from a game screen to How To Play and back (or any other modal-style navigation), the game screen may unmount and re-mount depending on stack config. When it remounts, `hasMountedRef.current` resets to false, the 50ms timer runs again, and cards animate in.

### Why this matters

Subtle — but it makes the animation feel un-intentional. The cards weren't "just dealt," they were already there.

### The fix

Two approaches:

**A. Check the saved-state path** — when the screen mounts via a restore (loadGame returned data), set `hasMountedRef.current = true` synchronously before the first render. This way restored games never animate.

**B. Detach the screen from the stack** — set `freezeOnBlur` or `unmountOnBlur: false` on the navigation stack config for game screens, so they don't fully unmount when you navigate to HowToPlay or modal screens.

A is cleaner; B has broader implications (memory usage, etc.). Recommend A.

---

## UX-4. No visual "dealing" state during the 50ms hasMountedRef delay

**Effort:** Skip (intentional, minor)

### What's happening

For the 50ms before `hasMountedRef.current = true`, cards are at their final position with no animation. If the user hits "Deal" and renders happen on a slow phone, there's a brief window where cards just appear with no transition.

### Why this matters

Almost never visible. Listed for completeness.

### The fix

Probably none needed. If you want to be precise, set initial opacity to 0 and only show cards once `hasMountedRef.current` is true. But it's a tradeoff — adds complexity for a 50ms invisible flash that almost nobody will see.

---

# 🧹 CODE QUALITY

These are all carried over from DEEP_REVIEW v2 — none have been completed. Plus two new ones from this sweep.

---

## CQ-1 through CQ-12

(All carried forward from v2 unchanged. See v2 doc for full beginner walkthroughs.)

---

## CQ-13. TypeScript dependency installed but unused

**Effort:** 2 minutes
**Risk if ignored:** None — pure cleanup

### What's happening

`package.json` lists `typescript` as a dependency, but the project is 100% JavaScript (no `.ts` or `.tsx` files, no `tsconfig.json`). Some tooling (Expo's default config) installed it by default.

This caused a small confusion in our last animation session — Claude Code ran `tsc` and got many "errors" that weren't real (just TypeScript complaining about a non-TypeScript project).

### Why this matters

Cosmetic only. Lower install size, cleaner `package.json`, no future confusion.

### The fix

```bash
npm uninstall typescript
```

That's it. Verify the app still builds and runs. (It will — nothing depends on `tsc` for production.)

---

## CQ-14. Save effects use raw JSON.parse without schema validation

**Effort:** 1-2 hours (post-launch)
**Risk if ignored:** Older saves silently break when the schema changes; user sees "couldn't load save" or game starts fresh

### What's happening

`game/gameSaves.js`:

```javascript
export async function loadGame(gameKey) {
  try {
    const raw = await AsyncStorage.getItem(gameKey);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    warn("[gameSaves] load failed — wiping corrupted save:", err);
    await AsyncStorage.removeItem(gameKey).catch(() => {});
    return null;
  }
}
```

This is fine when the save schema is stable. But if you add a new field to one of the game states in a future update (say, `gameState.metadata`), and a user loads a v1 save, the parsed object will be missing that field. Code that assumes `gameState.metadata` exists will crash or behave incorrectly.

### Why this matters

This is the same problem as IMP-7 (Schema versioning for saves). They're related:
- CQ-14 is the *detection* — notice when a save is from an older schema
- IMP-7 is the *handling* — version saves with `{ schemaVersion: 1, ... }`

For v1.0 with no migrations, you don't need either. For v1.1 onward, both become important.

### The fix (deferred to v1.1)

Combine with IMP-7. When you do a release that changes any save schema, bump `schemaVersion` and add a migration path. Loads should check the version and either migrate or wipe with a friendly message.

---

# 🚀 IMPROVEMENTS (post-launch)

(All carried forward from v2 unchanged.)

---

## IMP-8. Card move animation (the spec's recipe #3)

**Effort:** 4-6 hours
**Was:** Deferred from animations session

### What's happening

The Animations.md spec has "recipe #3" — card move animation (drag from hand to table, fly from deck to slot, etc.). This is the genuinely hard one. We deliberately skipped it to keep momentum.

### When to tackle

After v1 ships and you have user feedback. If players ask for it, do it. If they don't notice, skip until you do another polish pass.

---

## IMP-9. Solitaire face-down reveal flip

**Effort:** 1-2 hours
**Was:** Deferred from animations Level 2

### What's happening

Solitaire (Klondike) has many face-down tableau cards. When a card is uncovered, it should flip face-up (same 3D flip as Blackjack dealer reveal). We deferred this because Solitaire renders through `CardSlot`, not directly through `Card`.

### When to tackle

After IMP-8 or as a focused 1-hour session. Pattern is: pass `animateReveal` through `CardSlot` to `Card`. The flip already works; just needs prop plumbing.

---

# 🎯 Recommended order

If you want a suggested path:

### Pre-launch (must do before submitting)
1. **LAUNCH-1** — host the privacy policy file (~15 min)
2. **LAUNCH-2** — EAS production build (~90 min including walkthrough)
- ✅ ~~BUG-6~~ (TCP reassembly buffer, `734dae9`), ✅ ~~BUG-1~~ (Session A parity verified in code), ✅ ~~BUG-2~~ (hooks audit, `9bd069a`)

### Polish
- ✅ ~~BUG-4~~ (`5748463`), ✅ ~~BUG-3~~ (lobby `stopBroadcasting`), ✅ ~~CQ-13~~ (`3eb638a`), ✅ ~~UX-1~~ (`aeeca46`), ✅ ~~UX-2~~ (`fd37a71`), ✅ ~~ACC-1~~ (`79bc656`)
- ✅ ~~**ACC-2**~~ — screen-reader focus during the deal — DONE 2026-06-23 (`80e2850`) with a state flag; pending device test

### Post-launch (v1.1)
10. ~~**BUG-5**~~ — closed (Wild Round is multiplayer-only, no save needed)
11. **UX-3** — deal animation re-play (~15 min)
12. **PERF-1, PERF-2, CQ-5, CQ-6** — image/theme loading
13. **CQ-13** — uninstall TypeScript (~2 min)
14. **IMP-8, IMP-9** — animation polish

### Eventually
- Everything else as time allows
- IMP-2 (Jest tests) — long-term investment
- IMP-7 + CQ-14 — schema versioning when you start doing migrations

---

# 📌 Cross-references

- **DEEP_REVIEW_v2_archive.md** — previous review (fully resolved, file deleted)
- **PROJECT_NOTES.md** — authoritative project state
- **APP_STORE_REVIEW_NOTES.md** — paste-ready review notes for submission
- **Animations.md** — animation spec + completed phase notes
- Per-game specs: CONQUIAN_SPEC.md / WILDROUND_SPEC.md / LASTCARD_SPEC.md

---

# 📝 Session log

### Session 1 — 2026-05-17 (this doc created)
- v3 review created (this doc)
- v2 work confirmed complete (all v2 boxes were checked off and verified in code)
- Major finding: MultiplayerGameScreen.js Session A visual refactor didn't actually land
- Notable finding: BackHandler useEffect placements may be misplaced in multiple screens (Poker fix already done; others unaudited)

### Session 2 — 2026-06-01 (KICKOFF Task 0 + 0.5 + docs sync)
- Task 0: oriented on the project; read CLAUDE.md, RESPONSIVE_LAYOUT_PLAN.md, KICKOFF.md, DEEP_REVIEW.md, PROJECT_NOTES.md, App.js, Card.js.
- Task 0.5: hooks-order audit across all 9 game screens. **BUG-2 resolved** — only WildRound was broken (BackHandler `useEffect` below the `!gameState` guard); fixed in commit `9bd069a`.
- Docs sync: corrected `expo-av` → `expo-audio`, refreshed the PROJECT_NOTES dependency list + file tree to match the actual `screens/` `components/` `game/` files, fixed CLAUDE.md "9 games" → "8 games / 9 screens", and annotated the portrait-vs-default orientation state. PROJECT_NOTES.md confirmed as the canonical "current state" doc.
- Test foundation (IMP-2): added a lean, app-decoupled Jest setup (`npm test`) and 150 unit tests covering ALL 7 pure logic modules — deck/blackjack, poker (hand ranking), conquian (7-J run), rummy (melds/deadwood), lastCard (play legality), solitaire (move legality), wildround (round/scoring). `jest.setup.js` shims the `__DEV__` global. Not covered yet: reducers, AI, networking.
- Notes: Tasks 1–4 (gesture/animation foundation + responsive Solitaire pilot + drag test) not yet started.

### Session 3 — 2026-06-02 (safe-fixes batch + deep-dive review)
- Fixes landed: **BUG-4** auto-save throttle ×4 screens (`5748463`); **CQ-13** removed the vestigial `typescript` dep (`3eb638a`).
- **UX-1** — initially looked like a trivial color swap but white-on-`#7fb3ff` fails contrast (~2.1:1); implemented properly with blue bg + dark button text + a per-state text style. Commit `aeeca46`.
- **Deep-dive review** of GameNetwork, gameSaves, wallet, ErrorBoundary, MultiplayerGameScreen, LobbyScreen:
  - **BUG-1 → resolved** (new multiplayer layout is in place; old section styles gone).
  - **BUG-3 → resolved** (`stopBroadcasting()` now in all lobby exit paths).
  - **BUG-6 (new, high)** — TCP messages aren't reassembled; large broadcasts fragment and get silently dropped → multiplayer desync. Fix recipe documented above.
  - Verified still-open/deferred: CQ-14 (raw `JSON.parse`, no schema), PERF-3 (full-state broadcast — compounds BUG-6). `wallet.js` looks solid (write-serializing queue); `ErrorBoundary` fine.
- Incidental: `react-native-reanimated` is already present in `node_modules` as a transitive dep (not in package.json) — relevant to KICKOFF Task 1.
- **Fixes landed same day** (all device-free to write, verify on device): **BUG-6** TCP reassembly buffer (`734dae9`), **UX-1** theme accent + contrast (`aeeca46`), **UX-2** conditional Blackjack modal delay (`fd37a71`), **ACC-1** hide decorative dots/ghosts from screen readers (`79bc656`). **ACC-2 deferred** (ref → no re-render; needs a state flag). Remaining open bug: **BUG-5** (WildRound save/resume — a feature, needs a design pass). Deliberately not touched: CQ-1…12 refactors, PERF-1/2 image rework, CQ-14 (v1.1 schema versioning).

### Session 4 — 2026-06-23 (doc sync + branch cleanup + ACC-2)
- **Doc accuracy sweep** (`ff8876a`, `8b18a79`): brought CLAUDE.md + PROJECT_NOTES
  back in line with the actual codebase. 8→9 games (Who Am I? added; multiplayer
  Blackjack removed); CLAUDE.md key-files list expanded; PROJECT_NOTES file tree
  fixed — removed deleted `MultiplayerGameScreen.js`, added `WhoAmIGameScreen.js`,
  and **rewrote the components/ tree** (it listed 3 deleted files — two marked
  "still live" — and omitted ~12 that exist). Dependency list rewritten to match
  package.json (added @sentry, expo-asset/constants/haptics/screen-orientation/
  system-ui, react-native-gesture-handler; dropped react-native-draggable-flatlist).
- **Branch cleanup:** consolidated work onto `main` and removed the
  session's auto-created feature branch (`claude/ecstatic-cannon-vx06pn`). Single
  branch (`main`) going forward.
- **ACC-2 fixed** (`80e2850`): screen-reader hand-hiding during the fresh deal in
  Rummy + Conquián, via a fail-safe state flag. Pending device test (no TalkBack
  available in the dev environment).
- **`game/` file tree completed**: added the 11 missing files (whoami, lastCardImages,
  useLayoutMode, haptics, avatars, avatarTransmit, tablePalette, lastCardTheme,
  rummyTheme, pokerTheme, gofishTheme); fixed stale `cardTheme.js` figure
  (265/5-themes → 386/7-themes; theme-system-files list 371→386); resolved the
  "CLAUDE.md still says 8 games" warning note.
- **Toolchain + tests:** installed deps in the remote dev env (no `node_modules`
  was present) so jest/bundler run here. Confirmed the full suite green, then
  **expanded `whoami.test.js` 17→26 tests** (awardRound no-pending + phase-guard +
  'gotit' history branches, single/two-player asker edges, purity of
  recordAnswer/awardRound/nextRound). Added `__tests__/rummy.knock.test.js` (8
  tests) for `canRummyPlayerKnock` — gin/500 knock thresholds, variant routing
  (same hand, different verdict), Indian-Rummy run requirement, null-safety.
  Mined more pure-logic gaps: `lastCard.draw.test.js` (reshuffleDeck +
  drawUntilPlayable — draw loop, empty-pile reshuffle, exhaustion), `poker.util.test.js`
  (combinationsOfSize C(n,k) + getPokerVariantConfig fallback), and
  `conquian.borrow.test.js` (doTakeWithBorrow — the spec's 7-set→run borrow,
  auto-take-after-rearrange, and pool/validity/turn rejections). Also
  `conquian.take.test.js` (doTakeActiveCard — new-meld-from-hand, extend, the
  winning take, and all guards), so both take paths (with/without borrow) are now
  covered. Suite now **368 tests / 27 suites, all green**. Updated IMP-2.
  Remaining untested exports are low-value UI/format helpers (sortHand,
  formatPokerCard, getRankLabel, a few solitaire display helpers).
- Notes: standing rule added as CLAUDE.md §3.6 — keep docs updated as part of every
  change, no stale docs.

### Session N — [Date]
- [ ] ...
- Notes:

---

# 🏗️ Build & Release Status

*(Merged from EAS_REBUILD_PENDING.md on 2026-06-04 — that file is now deleted.)*


> ✅ **Built & verified 2026-06-04.** A development build shipped immersive bars,
> the `expo-screen-orientation` native module, `react-native-gesture-handler`
> (drag-and-drop), and the smaller APK — all live and confirmed on device. The
> orientation *policy* has since shifted (pure JS, no rebuild): portrait-locked
> except Solitaire. Dep tree was cleaned pre-build (removed dead
> `react-native-draggable-flatlist`; pinned/deduped `expo-asset`/`expo-constants`
> to SDK 54).

**Build workflow (for next time native deps/config change):**

```
eas build --profile development --platform android
```

…then install the new APK and `npx expo start --dev-client`. Native changes
(new modules, `app.json` manifest/config) only take effect after a build —
**EAS is the only path** (local `expo run:android` doesn't work on this machine).
Pure-JS changes hot-reload over Metro with no rebuild.

---

## What shipped in the 2026-06-04 build (historical)

All confirmed live on device:
- **Immersive bars** — `react-native-edge-to-edge` + `<SystemBars hidden>` in `App.js` (top + bottom hidden; swipe from an edge reveals briefly).
- **`expo-screen-orientation`** native module — now drives the runtime orientation lock (portrait-locked except Solitaire; see the Orientation policy section above).
- **`react-native-gesture-handler`** — powers Solitaire drag-and-drop.
- **Smaller APK** — dead JEWEL theme + unused source icon removed.
- **Local-network permissions** (`NEARBY_WIFI_DEVICES`, `ACCESS_WIFI_STATE`, etc.) confirmed present for multiplayer.

`app.json` remains `"orientation": "default"`; the runtime lock decides.

**Still pending:** LAUNCH-2 (production build) — see the Deep Review section.

---

# 🚀 Kickoff Brief (historical)

*(Merged from KICKOFF.md on 2026-06-04 — completed task brief, kept for history.)*


> **Archive.** This was the task-by-task brief that drove the gesture-stack
> setup, the responsive-layout pilot, and drag-and-drop. **All tasks completed by
> 2026-06-04.** Kept for history; its "standing reminders" are codified in
> `CLAUDE.md`.

---

What it covered (all done):
- **Task 0 / 0.5** — read-only orientation + hooks-order diagnostics before touching screens.
- **Task 1–2** — verified and wired the gesture/animation native stack (`GestureHandlerRootView` + `react-native-gesture-handler`).
- **Task 3** — responsive Solitaire pilot (`useLayoutMode()`).
- **Task 4** — drag-and-drop. (Shipped differently than first sketched: immediate touch-and-move activation, not long-press; `reanimated` turned out not to be needed — built-in `Animated` was enough.)

The "standing reminders" it listed — challenge-first, diagnostic-first, no `tsc`, hooks before early returns, commit per unit, no speculative libraries — all live in `CLAUDE.md`.

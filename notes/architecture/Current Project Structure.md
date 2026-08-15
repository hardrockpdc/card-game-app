---
verified: 2026-08-15
---

# Current project structure

Regenerated directly from the repo tree, not migrated from the archive — the archived
version was written in June and had drifted (missing files, some deleted files still
listed). Root config/build files omitted below; see the repo root directly for those
(`app.json`, `package.json`, `eas.json`, `firebase.json`, `database.rules.json`, etc.).

```
screens/               (35 files — every navigable screen)
  AboutScreen.js
  AchievementsScreen.js
  CardThemeScreen.js
  ConquianGameScreen.js
  ConquianSetupScreen.js
  FramesScreen.js
  GameScreen.js                      (single-player Blackjack)
  GameSetupScreen.js
  GoFishGameScreen.js
  GoFishPickerScreen.js
  HomeScreen.js
  HostSetupScreen.js
  HowToPlayScreen.js
  JoinOnlineScreen.js
  JoinScreen.js
  LastCardGameScreen.js
  LobbyScreen.js                     (local/UDP-discovery lobby)
  MemoryDifficultyPickerScreen.js
  MemoryGameScreen.js
  MultiplayerGamePickerScreen.js
  MultiplayerMenuScreen.js
  OnboardingScreen.js
  OnlineLobbyScreen.js               (Firebase room-code lobby)
  PokerGameScreen.js
  PokerVariantPickerScreen.js
  ProfileScreen.js
  ResultsScreen.js
  RummyGameScreen.js
  RummyVariantPickerScreen.js
  SettingsScreen.js                  (placeholder)
  SinglePlayerSetupScreen.js
  SolitaireGameScreen.js
  SolitaireVariantPickerScreen.js
  StatsScreen.js
  WhoAmIGameScreen.js

components/             (27 files — shared UI + hooks)
  Card.js                            (the card render + animation engine)
  CardThemePicker.js
  Confetti.js
  DailyBonusModal.js
  endOfRoundLogic.js
  EndOfRoundModal.js                 (shared win/results modal, all games)
  ErrorBoundary.js
  GameHeader.js
  GameMenu.js / GameMenuButton.js
  GameSetupLayout.js
  Haptic.js
  HowToShot.js
  PokerVariantWheel.js
  ProfileAvatar.js
  ReconnectOverlay.js
  ScrollWheelPicker.js
  StatsStrip.js
  SuitBackground.js
  TableThemePicker.js
  Toast.js
  TutorialOverlay.js
  useConquianMeldDrag.js
  useMultiplayerAvatars.js
  useOnlineReconnect.js              (see [[BUG-7]] — Last Card only, not adopted elsewhere)
  useSolitaireDrag.js
  useYourTurnBanner.js
  VariantOptionGrid.js
  YourTurnBanner.js

game/                   (44 files — pure logic + transport, no React except ThemeContext)
  achievements.js
  avatars.js / avatarTransmit.js
  cardTheme.js                       (theme registry, see [[Card Themes]])
  colors.js                          (semantic color tokens, added 2026-08-02)
  conquian.js / rummy.js / solitaire.js / poker.js / gofish.js / lastCard.js /
    whoami.js / memory.js / deck.js  (pure game logic per game, no React)
  dailyBonus.js
  errorReporter.js                   (Sentry wiring — dsn currently null, see [[Build and Release]])
  feltShop.js
  firebase.js                        (anonymous auth + RTDB)
  frames.js
  GameNetwork.js                     (transport façade — see [[GameNetwork]])
  gameSaves.js                       (versioned saves, see [[CQ-14]])
  gofishTheme.js / lastCardTheme.js / pokerTheme.js / rummyTheme.js / tablePalette.js / tableThemes.js
  haptics.js
  lastCardImages.js                  (109-image LastCard require map, extracted — see [[CQ-5]])
  lineProtocol.js                    (bounded TCP line-framing — see [[BUG-6]])
  logger.js
  onlineRoom.js                      (room-code lobby lifecycle)
  onlineTransport.js                 (Firebase relay: rooms/* + privateNet/*)
  profile.js
  ranks.js
  reduceMotion.js
  responsive.js
  rewards.js
  roomCleanup.js
  roomRoster.js                      (per-game min/max player limits)
  shop.js
  sounds.js                          (expo-audio playback — see [[CQ-15]] for coverage gaps)
  ThemeContext.js                    (React context wrapping cardTheme.js)
  useLayoutMode.js
  useResumePrompt.js
  wallet.js
```

Game-roster note: `game/` has pure-logic modules for all games except Who Am I? and
Memory Match's UI layer, which lean more on their screen files directly (`whoami.js`
and `memory.js` still exist and hold their pure logic, matching the pattern).

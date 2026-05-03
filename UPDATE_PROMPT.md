# Card Night — Multi-Phase Update Prompt

## Context

I'm Pedro, a beginner React Native developer. This is an **existing project** called Card Night — a cross-platform card game app that runs locally on the same WiFi (no internet). Read `PROJECT_NOTES.md` first to understand the project state, conventions, and what's already built. Also read `CONQUIAN_SPEC.md`, `WILDROUND_SPEC.md`, and `LASTCARD_SPEC.md` for game-specific context.

This is a **multi-phase update**. **Do not move on to the next phase until I confirm the current one works on my phone.** After each phase, give me a short summary of what changed, what files were touched, how to test it, and whether a new EAS build is needed.

---

## Important Project Conventions (read before coding)

- React Native + Expo (custom dev build, NOT Expo Go)
- Use `SafeAreaProvider` at root, `SafeAreaView` from `react-native-safe-area-context`
- Game logic lives in `game/*.js` as **pure functions** (no React)
- Multiplayer uses the host/client pattern documented in `PROJECT_NOTES.md` (`fullRef` / `applyState` / `toPublic` / `PRIVATE_HAND`)
- Card visuals use the existing `cardTheme.js` system — every theme image is a static `require()`. Adding new themes or assets requires editing this file.
- Save habit: after each meaningful change, I commit with `git add . && git commit -m "..." && git push`
- New native packages = new EAS build needed. JS-only changes don't.

---

## Beginner Rules for How You Work With Me

1. **Ask me clarifying questions before each phase if anything is unclear** — don't guess.
2. **Explain what you're doing in plain language.** When you introduce a new library, pattern, or API, give me a one-sentence explanation of what it is and why it's used.
3. **Recommend the simplest beginner-friendly approach** when there are multiple options. If you pick something more complex, justify why.
4. **Flag anything that could cause issues later** before doing it, and suggest alternatives.
5. After each phase, tell me: what changed, what files were touched, how to test, and whether I need a new EAS build.
6. **Wait for my confirmation** before moving to the next phase.

---

## Overall Goals (read all of this before starting Phase 1)

1. Restructure HomeScreen so it has three primary buttons: **Single Player**, **Multiplayer**, **Profile**. The current Home has Single Player, Host a Game, Join a Game — this needs to change.
2. Replace the floating-avatar-modal profile on HomeScreen with a real, dedicated Profile screen.
3. Build a Profile system (name, photo, card theme, stats) saved locally with AsyncStorage.
4. Move the Card Theme picker from Settings → Profile. Keep Settings screen as a placeholder for future settings (it'll be empty for now).
5. Remove name input fields from HostSetupScreen and JoinScreen — name comes only from Profile.
6. Add a Multiplayer menu screen with **four buttons**: Host Online, Join Online (both grayed out with "Coming Soon"), Host Local, Join Local (functional, wires to existing host/join flow).
7. Remove **Wild Round** from the Single-Player carousel (keep it fully working in multiplayer Lobby).
8. Add Blackjack **split** functionality.
9. Add **Poker variants**: Texas Hold'em (existing), Omaha, Five Card Draw, Seven Card Stud. When the user taps Poker, show a **simple tap-select picker**.
10. Add **Solitaire** as a new single-player-only game with 5 versions: Klondike, Spider, FreeCell, Pyramid, TriPeaks. Use the same simple tap-select picker style.
11. Add **Rummy** as a new game (single + multiplayer) with versions: Gin Rummy, Rummy 500, Indian Rummy, Canasta. Use the same simple tap-select picker style.
12. Make the entire app **scale up properly on larger screens** (phones with bigger displays, tablets). Same layout, just bigger. Portrait only.
13. Add **Stats tracking** to Profile (one big summary screen).

---

## Phase Breakdown

### Phase 1 ✅ COMPLETE — Audit + HomeScreen Restructure

**Audit first, then code.** Before making any changes:

a. Read `App.js`, `screens/HomeScreen.js`, `screens/SinglePlayerSetupScreen.js`, `screens/SettingsScreen.js`, `screens/CardThemeScreen.js`, `game/cardTheme.js`, `components/Card.js`, and `package.json`.

b. Tell me your audit findings: what's already in place that supports these goals, what's missing, and any concerns (especially around the existing in-memory profile in HomeScreen, the hardcoded card sizes in `Card.js`, and the parallel `CAROUSEL_GAMES` / `GAMES` arrays in `SinglePlayerSetupScreen.js`).

**Then make these changes:**

- Restructure HomeScreen to show three primary buttons:
  - **Single Player** (navigates to existing `SinglePlayerSetup` route)
  - **Multiplayer** (navigates to a new `MultiplayerMenu` screen — create it in Phase 2)
  - **Profile** (navigates to a new `Profile` screen — create it in Phase 3; for now, can be a placeholder)
- Remove the floating "?" avatar button and its profile modal entirely from HomeScreen.
- Keep the existing **How to Play** and **Settings** links at the bottom.
- Stop passing `profileName` as a route param from HomeScreen. The new Profile system will handle this in Phase 3.
- For Phase 1, temporarily fall back to "Player" as the default name everywhere it was using `profileName` until Phase 3 wires up the real Profile.

**Test:** Open the app, see the three new buttons, tap each. Single Player should still work. Multiplayer and Profile can navigate to placeholder screens.

---

### Phase 2 ✅ COMPLETE — Multiplayer Menu Screen

Create a new `MultiplayerMenuScreen.js` with **four buttons**:

- **Host Online** — disabled, gray, label says "Coming Soon"
- **Join Online** — disabled, gray, label says "Coming Soon"
- **Host Local** — functional, navigates to existing `HostSetup` route
- **Join Local** — functional, navigates to existing `Join` route

Register the new screen in `App.js` as `MultiplayerMenu`. Wire the HomeScreen's Multiplayer button to it.

**Test:** Tap Multiplayer on Home → see four buttons → Host Local and Join Local still work end-to-end (lobby, start game, etc.). Online buttons are visibly disabled.

---

### Phase 3 ✅ COMPLETE — Profile System Foundation

This phase requires installing a new native package, which means a new EAS build will be needed. **Tell me clearly when you're about to do this and stop so I can run the build.**

**Install:** `@react-native-async-storage/async-storage` (briefly explain: AsyncStorage is React Native's built-in way to save small bits of data on the device that survive app restarts — like browser localStorage but for mobile).

**Create a profile module** at `game/profile.js` (pure functions, no React):

- `loadProfile()` — returns saved profile or default
- `saveProfile(profile)` — persists to AsyncStorage
- `subscribeProfile(fn)` — listener pattern, same as `cardTheme.js`
- Profile shape: `{ name: string, photoType: 'avatar' | 'custom' | null, photoValue: string | null, cardTheme: string, stats: {} }`
  - `photoType: 'avatar'` → `photoValue` is the avatar ID (e.g., `'avatar_01'` through `'avatar_20'`)
  - `photoType: 'custom'` → `photoValue` is the local file URI
  - `photoType: null` → no photo set yet

**Create `screens/ProfileScreen.js`** with:

- Name field (editable any time, persisted)
- Photo selector showing current photo (circular, cropped)
- Tapping the photo opens a chooser: "Choose Avatar" / "Take Photo" / "Choose from Camera Roll"
- For now, **20 placeholder avatars** = colored circles each containing a different animal emoji (🐶🐱🐰🐼🦊🐨🐯🦁🐮🐷🐸🐵🐔🦄🐙🦋🐝🐢🦉🦊 — pick 20 distinct emojis, ID them `avatar_01` through `avatar_20`). Tell me clearly that these are placeholders and I'll swap in real artwork later.
- Card Theme row that links to the existing `CardThemes` route (do NOT duplicate the picker — link to the existing screen)
- Stats section: leave empty / "Coming soon" placeholder for now (built in Phase 13)

**For photo upload + crop**: use `expo-image-picker` and `expo-image-manipulator` (both are Expo-native, so no extra native modules required beyond AsyncStorage). Crop selected/captured photos to a circular 1:1 aspect.

**First-launch flow:** On app start, if no profile exists yet, navigate to ProfileScreen with a "Welcome! Set up your profile (you can change anything later)" banner. Block the user from navigating to game screens until they've at least entered a name.

**Wire profile name into existing screens:**

- `HomeScreen` — pull name from profile (if set), pass nothing as route params
- `SinglePlayerSetupScreen` — read `myName` from profile, not route params
- `HostSetupScreen` — **remove the name input field entirely**. Read host name from profile.
- `JoinScreen` — **remove the name input field entirely**. Read player name from profile.

**Test:** Set up profile, restart app — profile persists. Pick avatar, name shows on game screens, host/join screens no longer ask for name.

---

### Phase 4 ✅ COMPLETE — Move Card Theme to Profile, Keep Settings as Placeholder

- The existing `CardThemes` route stays as-is (don't rebuild it).
- In `ProfileScreen`, the "Card Theme" row navigates to `CardThemes` (already done in Phase 3).
- Update `cardTheme.js` so the active theme is **persisted to AsyncStorage via the profile module** (currently it resets on every app restart). When `setTheme` is called, update the profile's `cardTheme` field and save.
- On app launch, load the saved theme from profile and call `setTheme()` to apply it.
- **Remove** the Card Themes row from `SettingsScreen.js`. Replace its content with a simple "More settings coming soon" placeholder. Keep the screen and the ⚙️ Settings link on Home — we'll add things here later.

**Test:** Change theme in Profile, close app, reopen — theme is still applied. Settings screen shows the placeholder message.

---

### Phase 5 ✅ COMPLETE — Remove Wild Round from Single Player

- In `screens/SinglePlayerSetupScreen.js`, remove the `wildRound` entry from both `CAROUSEL_GAMES` and `GAMES` arrays.
- **Do NOT touch** `WildRoundGameScreen.js`, `game/wildround.js`, `game/wildroundCards.json`, or the Wild Round entry in `LobbyScreen.js`. Multiplayer Wild Round must keep working exactly as it does today.

**Test:** Single Player carousel no longer shows Wild Round. Multiplayer Lobby still has Wild Round and it still works in a 3+ player game.

---

### Phase 6 ✅ COMPLETE — Card Component + Screen Scaling Foundation

This phase tackles the screen scaling problem. **Audit first**, then plan with me before coding.

**Audit:**

- `components/Card.js` has hardcoded sizes (70×100 and 42×60). This blocks scaling.
- 5 of 16 screens use `useWindowDimensions`; 11 don't (most game screens).

**Plan with me:** Before coding, propose your approach. My preference is the simplest beginner-friendly option. Likely candidates:

- A `responsive.js` helper module that exports scaling functions based on screen width
- Updating `Card.js` to accept a `size` prop or compute size from window dimensions
- Updating each game screen to use responsive sizing

Once we agree, do the foundation:

- Update `Card.js` to scale card size based on screen width (with sensible min/max).
- Lock the app to **portrait only** (`app.json` orientation setting).
- Apply responsive sizing to the easiest game screen first (Blackjack `GameScreen.js`) so I can see the effect on my phone vs my tablet (if I have one).

**Test:** Cards visibly larger on a bigger screen. Portrait locked. App looks normal on phone.

---

### Phase 7 ✅ COMPLETE — Apply Scaling to Remaining Screens

Apply the same responsive sizing pattern to:

- `MultiplayerGameScreen.js` (Blackjack multiplayer)
- `GoFishGameScreen.js`
- `PokerGameScreen.js`
- `ConquianGameScreen.js`
- `LastCardGameScreen.js`
- `WildRoundGameScreen.js`
- All non-game screens that don't already have it (HostSetupScreen, JoinScreen, LobbyScreen, HowToPlayScreen, ResultsScreen)

**Same layout, just bigger.** No tablet-specific layouts.

**Test:** Each game looks proportionally bigger on a larger screen.

---

### Phase 8 ✅ COMPLETE — Blackjack Split

Add the ability to **split** when the player is dealt two cards of the same rank.

- Apply to both `screens/GameScreen.js` (single-player) and `screens/MultiplayerGameScreen.js` (multiplayer).
- When eligible, show a **Split** button alongside Hit / Stand.
- After split: two hands, play one then the other, dealer plays once at end against both.
- Keep all other Blackjack rules unchanged.

**Test:** Get two same-rank cards (deal a few hands), split, play both hands, see results correctly.

---

### Phase 9 ✅ COMPLETE — Poker Variants

Poker variants are now built.

- Added a tap-to-select Poker variant picker.
- Tapping Poker in the carousel opens the picker.
- PokerGameScreen now supports:
  - Texas Hold'em
  - Omaha
  - Five Card Draw
  - Seven Card Stud
- Single-player Poker and multiplayer Poker both work.
- Lobby saves the chosen Poker variant and keeps the host params intact.
- GameNetwork now has a browser-safe fallback so the app can run in web dev mode without crashing.

**Test:** Poker variant can be chosen, saved, and used in both single-player and multiplayer.

---

### Phase 10 ✅ COMPLETE — Solitaire (Single Player Only, 5 Versions)

**Plan with me first** — Solitaire is significant new work. The picker and routes are wired in; gameplay has been verified. Tell me your plan for the 5 versions:

- Klondike (the classic Windows one)
- Spider (1-suit easy, 2-suit medium, 4-suit hard — confirm with me which difficulties to ship)
- FreeCell
- Pyramid
- TriPeaks

**Then build:**

- New `game/solitaire.js` (or split per variant if it makes sense — your call, but explain why).
- New `screens/SolitaireGameScreen.js`.
- Add a `SolitaireVariantPicker` with the same simple tap-select style used for Poker.
- Add Solitaire to the single-player carousel in `SinglePlayerSetupScreen.js` (both `CAROUSEL_GAMES` and `GAMES` arrays).
- Tapping Solitaire in the carousel goes to the variant picker, then the game.
- Single-player only — do **not** add to LobbyScreen.

**Test:** All 5 versions playable, correct rules, win/lose detected. Solitaire is verified; polish can happen later.

---

### Phase 11 ✅ COMPLETE — Rummy (Single + Multiplayer, 4 Versions)

Rummy is complete and wired into the app.

- Added `game/rummy.js` with shared helpers and the four shipped modes.
- Added `screens/RummyGameScreen.js` for single-player and multiplayer.
- Added `RummyVariantPicker` with the same simple tap-select style.
- Added Rummy to the single-player carousel.
- Added Rummy to `LobbyScreen.js` so hosts can pick it in multiplayer.
- AI difficulty: Easy/Medium/Hard for single-player, matching the pattern of the other games.

**Test:** Each variant plays correctly. Single-player vs AI works. Multiplayer works between two phones.

---

### Phase 12 ✅ COMPLETE — Variant Pickers Polish

By this point we have three variant pickers (Poker, Solitaire, Rummy). Make sure they all use the same simple tap-select picker component for consistency. If you built them ad-hoc earlier, refactor into a shared `components/VariantPicker.js` now.

**Test:** All three pickers look and feel the same. Each variant launches the correct game.

---

### Phase 13 — Stats Tracking

Add stats tracking to the Profile.

**Track per game type:**

- Games played
- Wins / Losses
- Win rate (calculated from games played + wins)
- Current win streak
- Longest win streak
- Total winnings (poker/blackjack chips)
- Highest single hand (where applicable)
- Fastest solitaire win (Solitaire only)
- Favorite game (most played, calculated)

**Implementation:**

- Add a `recordGameResult({ game, variant, result, ...gameSpecificData })` function in `game/profile.js`.
- Hook it into the end-of-game logic for every game.
- Save to AsyncStorage as part of the profile.
- Show **one big stats summary screen** in ProfileScreen — list every game with its stats, then a "Favorite Game" line at the top calculated from the data.

**Test:** Play a few hands of each game. Check stats screen — counts and win/loss are accurate. Force-close app and reopen — stats persist.

---

## Final Notes

- Multiplayer player limits per game (use these in LobbyScreen and any new multiplayer code):
  - Blackjack: 2–6
  - Go Fish: 2–4
  - Poker: 2–8
  - Conquián: 2–4
  - Wild Round: 3–8
  - Last Card: 2–8
  - Rummy: 2–4 (Gin Rummy 2 only)
- Once a multiplayer room is full, it auto-locks. Host cannot kick players.
- For online multiplayer (Host Online / Join Online buttons): not in scope. Just keep the "Coming Soon" buttons from Phase 2.

**Start with Phase 13: do the audit, share findings, ask any clarifying questions, then make the next phase changes. Stop when the current phase is done and wait for me to confirm.**

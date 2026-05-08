# Card Night — Update Prompt (Continuation)

## Overview

This is a continuation prompt. Phases 1–3 of a previous update have already been completed (Blackjack safe-area layout fix, Solitaire horizontal scrolling for FreeCell/Pyramid/TriPeaks, and Last Card highlight rules per difficulty). The files modified during those phases were `GameScreen.js`, `LastCardGameScreen.js`, `SinglePlayerSetupScreen.js`, and `SolitaireGameScreen.js`.

This prompt covers **three new phases** that build on top of that work. Each phase is self-contained and should be built and tested before moving to the next one. Phases are ordered so that no later phase depends on an earlier one being unfinished.

**Tech Stack:** React Native + Expo, React Navigation (native-stack), portrait-only, responsive sizing via `game/responsive.js`. Persistence uses `@react-native-async-storage/async-storage` (already installed, v2.2.0).

**Theme:** Dark theme — `#1a1a2e` background, `#16213e` cards, `#e94560` accent.

---

## Build Order (3 Phases)

1. **Phase 1** — Global coin wallet + economy system (foundation for everything else)
2. **Phase 2** — Blackjack betting system (uses the wallet from Phase 1)
3. **Phase 3** — Single-player save & resume system (built last because it touches every single-player game, so all gameplay/economy changes need to be locked in first)

---

## Phase 1: Global Coin Wallet & Economy System

**Goal:** Replace any per-game currency idea with a single app-wide coin wallet. The player starts with **1000 coins** the first time they open the app. Coins can be earned or spent across both single-player and multiplayer games. The end goal (later, not in this update) is a tier/leaderboard system for friends to compare totals — so the coin system needs to be structured cleanly enough to support that later.

### 1a — Wallet Storage Helper

**Create a new file:** `game/wallet.js`

This is the single source of truth for the player's coin balance, used by every game and the profile screen. It should expose:

- `getCoins()` — async function that returns the current coin balance. If no balance has ever been saved, return `1000` (the starting amount) and save it.
- `setCoins(amount)` — async function that saves the new balance. Should clamp at 0 (no negative balances).
- `addCoins(amount)` — async helper that loads the current balance, adds the amount, and saves. Returns the new balance.
- `subtractCoins(amount)` — async helper that loads the current balance, subtracts the amount (clamped at 0), and saves. Returns the new balance.
- `resetCoins()` — async function that resets the balance back to 1000. Used by the Reset Coins button on the profile screen.

The AsyncStorage key should be `@cardnight:wallet:coins`. Store as a string and parse to a number on read.

**Concept note for beginner context:** AsyncStorage only stores strings, so we use `String()` / `parseInt()` to convert. A small helper file like this means every game screen calls the same function and we don't have multiple places writing to the same key (which would cause bugs).

### 1b — Earning Coins (Single-Player)

When the player **wins** a single-player game, award coins based on game type:

- **Solitaire (all variants):** +250 coins on win. There's no "loss" in Solitaire — if the player gives up or starts a new game without winning, no coins are awarded.
- **Rummy (all variants including Conquián):** +500 coins on win, 0 on loss
- **Last Card:** +500 coins on win, 0 on loss
- **Go Fish:** +500 coins on win, 0 on loss

The reward should be triggered the moment the win is detected in the game logic. Show a small visual confirmation on the result screen — e.g., a "+250 coins" or "+500 coins" line near the win message. Do **not** award coins more than once per game — guard against this by setting a flag in component state once the reward has been granted for the current game.

**Blackjack** is handled separately in Phase 2 (it's bet-based, not fixed-reward).

### 1c — Earning Coins (Multiplayer)

For multiplayer, behavior depends on game type:

- **Rummy / Last Card / Go Fish / Wild Round (multiplayer):** No buy-in. Winner gets +500 coins, losers get 0. Same as single-player wins, just triggered through the multiplayer game flow.
- **Poker multiplayer (Hold'em, Omaha, Five Card Draw, Seven Card Stud):** Tournament-style buy-in. The host sets a **buy-in value** when creating the game (preset options: 100, 250, 500, 1000 coins, with the host's wallet capping the maximum they can offer). Each joining player must pay the buy-in from their wallet to enter — if a player doesn't have enough coins, they can't join. The buy-in becomes their starting chip stack. Last player standing wins all the chips. Whatever chips remain in the winner's stack convert 1:1 back to coins and are added to their wallet.

**Wild Round** is multiplayer-only (no single-player version). Treat it like Rummy/Last Card/Go Fish multiplayer: no buy-in, +500 to winner.

### 1d — Single-Player Poker (Buy-in)

Single-player Poker also uses tournament-style buy-in, since the user wants Poker to feel consistent across modes.

- Before starting a single-player Poker game, the player picks a buy-in amount from preset options (100, 250, 500, 1000), capped at their current wallet balance.
- The buy-in is subtracted from their wallet and becomes their starting chip stack.
- The AI opponents each get the same starting chip stack (no coin transaction for AI — they don't have wallets).
- Tournament-style: play continues until only one player has chips. If the human player wins, their remaining chips convert back to coins and go to the wallet. If the human player loses (runs out of chips), they get nothing — their buy-in is gone.

The buy-in selection UI should live on the Poker variant picker screen, below the variant list (similar to how opponent count and difficulty already live there). Show the player's current wallet balance somewhere visible so they know what they can afford.

### 1e — Game Over (Out of Coins)

The "Game Over — go to profile to reset" experience applies to **Blackjack only** (covered in Phase 2). For other games:

- **Single-player non-betting games (Solitaire, Rummy, Last Card, Go Fish):** Players don't lose coins, so they can never run out from playing these. No Game Over screen needed.
- **Single-player Poker:** If the player can't afford the minimum buy-in (100 coins) when trying to start a Poker game, show a message on the Poker variant picker like *"You don't have enough coins to play. Visit your profile to reset your coins."* Disable the Play button until they have at least 100 coins. This is **not** an interruption of an existing game — Poker games are tournament-style, so once you've bought in, you play until the tournament ends regardless of your wallet.
- **Multiplayer games with buy-in (Poker):** Same idea — if the player can't afford the host's buy-in, they can't join the game and should see a clear message explaining why.
- **Multiplayer non-buy-in games (Rummy/Last Card/Go Fish/Wild Round multiplayer):** No coin requirement to join, no Game Over.

### 1f — Profile Screen: Coin Display & Reset Button

**File to modify:** `ProfileScreen.js`

Add to the profile screen:

1. **Coin balance display** — Show the player's current coin balance prominently. Use a coin icon (emoji 🪙 is fine if no asset is available) and the number, styled to match the existing profile layout.
2. **Reset Coins button** — A button (always visible, regardless of current balance) labeled "Reset Coins" or "Reset to 1000". Tapping it shows a confirmation popup:
   - Title: *"Reset Coins?"*
   - Message: *"This will reset your coin balance back to 1000. Are you sure?"*
   - Buttons: *"Cancel"* and *"Reset"*
   - On Reset: call `resetCoins()` from the wallet helper, update the displayed balance, dismiss the popup.

**No cooldown** — the player can reset as many times as they want.

### 1g — Coin Display in Game Screens

For visibility, also show the current coin balance somewhere on:

- **Home Screen** — small coin display in a corner so the player always sees their balance
- **Each game screen** — small coin display so the player can track changes during play

Keep it small and unobtrusive — coin icon + number, top corner is fine. Use the responsive sizing helpers.

### 1h — Future-Proofing for Tier Lists

Even though tier lists aren't being built in this update, structure the wallet so it's easy to add later:

- Don't store *only* the current balance. Also track **total coins ever earned** (a separate AsyncStorage key, e.g., `@cardnight:wallet:lifetime_earned`). Every time `addCoins` is called with a positive amount, also add that amount to the lifetime total. This gives a number to base future tiers on (current balance fluctuates and resets, but lifetime earned only goes up).
- Expose a `getLifetimeEarned()` helper from `game/wallet.js`.
- Don't display lifetime earned anywhere yet — it's just being tracked silently for the future tier feature.

---

## Phase 2: Blackjack Betting System

**Goal:** Convert Blackjack into a casino-style experience. Every hand requires placing a bet from the wallet first. There is no "practice mode" — betting is the only way to play Blackjack.

**File to modify:** `GameScreen.js` (the Blackjack screen, based on the previous Phases 1–3 modifications already in place).

### 2a — Three-State Flow

Restructure the Blackjack screen into three clear states:

1. **Betting state** — Player sees their wallet balance at the top, a row of preset bet buttons (**10, 25, 50, 100, 250**), and a "Deal" button. The Deal button is disabled until a bet is selected. Disable any bet button whose amount is greater than the player's current wallet balance (so they can't bet coins they don't have).
2. **Playing state** — Same as the current Blackjack gameplay (Hit, Stand, etc.), with the current bet amount displayed somewhere visible (e.g., near the wallet balance).
3. **Result state** — After the hand resolves (player wins, loses, ties, or busts), show the result, update the wallet via `addCoins` or `subtractCoins`, and show a "Next Hand" button that returns to the Betting state.

### 2b — Bet Resolution Rules (Standard Casino)

- **Player wins** (beats dealer): `+bet amount` (player effectively gets their bet back plus an equal amount in winnings — implementation-wise, subtract the bet up front when Deal is tapped, then add `2 × bet` on a win)
- **Player blackjack** (natural 21 on first two cards, dealer doesn't also have blackjack): pays 1.5× bet, rounded down to whole coins (so a 25 bet wins 37, etc.)
- **Player loses or busts**: bet amount is lost (already subtracted up front when Deal was tapped)
- **Push (tie)**: bet returned, no net change to balance

**Implementation pattern:** When the player taps Deal, immediately call `subtractCoins(bet)`. Then on result resolution, call `addCoins` with the appropriate payout (0 for loss, `bet` for push, `2 × bet` for win, `bet + Math.floor(bet * 1.5)` for blackjack). This way the wallet is always correct even if the hand is interrupted.

### 2c — Game Over (Out of Coins)

When the player's wallet hits **0** at the end of a hand:

1. Show a "Game Over" overlay/modal with the message: *"You're out of coins! Visit your profile to reset your coins."*
2. The modal has one button: *"OK"* (or *"Go to Profile"* if you want to make navigation one tap easier).
3. Tapping the button dismisses the modal and either returns to the home screen or navigates directly to the profile screen — your call, but it should be impossible to keep playing Blackjack with 0 coins.
4. The Reset Coins button on the profile screen (built in Phase 1) is what brings them back into the game.

Also handle the "can't even afford the minimum bet" case: if the player has between 1 and 9 coins after a hand, the same Game Over modal should appear, since they can no longer place the minimum bet of 10. Treat "can't afford minimum bet" the same as 0 coins.

### 2d — UI Notes

- Match the existing Blackjack dark theme.
- Wallet balance display should be prominent (top of screen) and update in real time as bets are placed and resolved.
- Bet buttons should be styled consistently with other action buttons in the app — rectangular, dark background, accent color border when selected.
- Use the responsive sizing helpers (`scale()`, `scaleFont()` from `game/responsive.js`).
- Keep the previous safe-area fix intact — the betting UI must not extend under the device's navigation bar.

---

## Phase 3: Resume Single-Player Games (Save & Restore)

**Goal:** If the player closes the app, switches away, or otherwise exits a single-player game, they can come back and pick up exactly where they left off. Each game type **and each variant** has its own independent save slot.

**Games included (every single-player game):**
- Blackjack
- Solitaire — Klondike, Spider, FreeCell, Pyramid, TriPeaks (each variant saves separately)
- Rummy — Gin Rummy, Rummy 500, Indian Rummy, Canasta, Conquián (each variant saves separately)
- Poker — Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud (each variant saves separately)
- Last Card
- Go Fish

**Multiplayer games are NOT included** — saves only apply to single-player. Wild Round is multiplayer-only and therefore is not part of this system.

### 3a — Save Storage Helper

**Create a new file:** `game/gameSaves.js`

This file handles saving and loading game state for any single-player game. It should expose:

- `saveGame(gameKey, state)` — async function that saves a state object under the given key. Use `JSON.stringify` to serialize.
- `loadGame(gameKey)` — async function that returns the saved state object (parsed from JSON), or `null` if no save exists.
- `clearGame(gameKey)` — async function that deletes the saved state for that key.
- `hasSave(gameKey)` — async function that returns `true` if a save exists, `false` otherwise.

**Key naming convention:** Use a consistent format like `@cardnight:save:<gametype>:<variant>`. Examples:
- `@cardnight:save:blackjack`
- `@cardnight:save:solitaire:spider`
- `@cardnight:save:solitaire:freecell`
- `@cardnight:save:rummy:gin`
- `@cardnight:save:rummy:conquian`
- `@cardnight:save:poker:holdem`
- `@cardnight:save:lastcard`
- `@cardnight:save:gofish`

This keeps each game/variant independent — starting a Spider save never touches a FreeCell save.

### 3b — When to Save

In each single-player game screen, save the game state automatically whenever something meaningful changes — for example, after each move, after each turn, or after each card is played. The exact moments depend on the game, but the goal is: **if the app is killed at any point, reopening should bring the player back to within one move of where they were.**

A simple pattern: use a `useEffect` that watches the relevant game-state values and calls `saveGame(gameKey, currentState)` whenever they change.

**What to include in the saved state:**
- The full game-engine state (deck, hands, piles, scores, turn info — whatever the game's logic file uses internally)
- Difficulty (if applicable)
- Number of opponents (if applicable)
- For Blackjack: which of the three states the player is in (betting/playing/result), the current bet amount, and the current hand cards. Do **not** save the wallet balance here — it's already saved separately by Phase 1.
- For Poker: the current chip stacks, the current hand state, and the original buy-in amount
- For Rummy/Last Card/Go Fish: AI player states as well, so opponents continue from where they were

**What NOT to include:**
- React component state that can be re-derived (animation values, modal open/closed flags — let those reset to defaults on resume)
- The player's profile info (already stored elsewhere)
- The wallet balance (lives in `game/wallet.js`, not in saves)

### 3c — When to Clear the Save

Clear the saved game (call `clearGame(gameKey)`) when:

- The game ends naturally (win, loss, draw, game over)
- The player taps "New Game" and confirms they want to start a fresh one (see 3e)
- The player explicitly quits and confirms they want to abandon the game (optional — only if there's an in-game quit button)

### 3d — Resume Detection on Screen Mount

When a single-player game screen mounts, the **first** thing it should do is check `hasSave(gameKey)`:

- If there is a save **and** the screen was navigated to with intent to resume (see 3e for how that's signaled) → call `loadGame(gameKey)` and restore the state. Skip the normal "deal a fresh hand" setup.
- If there is no save, or the player chose Start New → run the normal fresh-game setup and call `clearGame(gameKey)` to make sure no stale save lingers.

### 3e — "Continue or Start New?" Prompt

When the player taps to start a single-player game (e.g., taps Play on Blackjack, or picks Spider from the Solitaire variant picker, or taps Play after configuring opponents on Last Card via `GameSetupScreen`):

1. **Before** navigating to the game screen, check `hasSave(gameKey)` for that specific game/variant.
2. **If a save exists**, show a modal/popup with the title *"Game in Progress"* and the message *"You have a saved game for [Game Name]. Would you like to continue or start a new game?"*
3. The modal has two buttons:
   - **Continue** — Navigate to the game screen with a route param like `resumeFromSave: true`. The screen reads this param and loads the save instead of dealing fresh.
   - **Start New** — Call `clearGame(gameKey)`, then navigate to the game screen normally (no resume param). The screen sees no save and starts fresh.
4. **If no save exists**, just navigate normally — no popup needed.

**Where to put the prompt logic:** The cleanest place is wherever the "Play" button currently lives for each game — the variant picker screens (Solitaire, Rummy, Poker), the `GameSetupScreen` (Go Fish, Last Card), and `SinglePlayerSetupScreen` for Blackjack. Each of those screens should do the `hasSave` check before navigating.

To avoid copy-pasting the modal logic across many screens, it's worth creating a small helper hook or component — for example `useResumePrompt(gameKey, gameName)` that returns a function `promptThenNavigate(navigateFn)` which handles the check and modal automatically. The exact abstraction is up to you, but the **behavior** described above is what matters.

### 3f — Edge Cases to Handle

- **Save format changes:** If the save was created by an older version and is missing fields, gracefully fall back to starting a new game and clear the bad save. Don't crash.
- **JSON parse failure:** If `loadGame` throws or returns garbage, treat it as no save (clear it and start fresh).
- **Player navigates away mid-game:** Already handled by 3b — the save is up to date because saves happen continuously.
- **Multiplayer games:** Do not call any save/load logic from multiplayer game screens. This system is single-player only.
- **Poker buy-in interaction:** If a Poker save is restored, do **not** subtract the buy-in again from the wallet — it was already subtracted when the original game started. The saved chip stack reflects the in-progress tournament.

---

## Important Notes

- **Do NOT change game logic** in the rule engines (`game/deck.js`, `game/conquian.js`, `game/poker.js`, `game/rummy.js`, `game/solitaire.js`, `game/lastCard.js`) unless a phase explicitly requires it. None of these phases require it — saves serialize the existing state, betting wraps existing Blackjack logic, etc.
- **Do NOT change multiplayer networking** beyond what's needed for the buy-in flow in Poker multiplayer (Phase 1c). The host setting a buy-in value and broadcasting it to clients is the only networking change required.
- **Do NOT change** the Home Screen layout beyond adding the small coin display (Phase 1g). Same for the Settings screen and any unrelated screens.
- **Test each phase independently** before moving on. The order is chosen so each phase stands alone.
- **Preserve responsive sizing** — continue using `scale()` and `scaleFont()` from `game/responsive.js` and `useWindowDimensions()` where appropriate.
- **Keep the same dark theme** (`#1a1a2e` background, `#16213e` cards, `#e94560` accent, etc.) across all new UI.
- **AsyncStorage is already installed** (`@react-native-async-storage/async-storage` v2.2.0) — no new dependencies are required for any phase.
- **Phases 1–3 of the previous update are already complete** — the Blackjack safe-area fix, Solitaire horizontal scrolling, and Last Card highlight rules are already in place. Don't redo those.

---

## Files That Will Be Modified

**Phase 1 (Wallet & Economy):**
- `ProfileScreen.js` — coin display, Reset Coins button + confirmation modal
- `HomeScreen.js` — small coin display in corner
- `GameScreen.js` (Blackjack) — show coin balance (full betting flow comes in Phase 2)
- `SolitaireGameScreen.js` — award +250 on win
- `RummyGameScreen.js` — award +500 on win (single-player) or via multiplayer flow
- `ConquianGameScreen.js` — award +500 on win
- `LastCardGameScreen.js` — award +500 on win (single-player) or via multiplayer flow
- `GoFishGameScreen.js` — award +500 on win (single-player) or via multiplayer flow
- `PokerGameScreen.js` — buy-in subtraction on start, chip-to-coin conversion on win
- `WildRoundGameScreen.js` — award +500 to winner (multiplayer only)
- `MultiplayerGameScreen.js` — coordinate winner reward across multiplayer games
- `PokerVariantPickerScreen.js` — buy-in selector for single-player Poker
- `HostSetupScreen.js` — buy-in selector for multiplayer Poker (host sets the value)
- `JoinScreen.js` / `LobbyScreen.js` — show buy-in to joining players, block joins if they can't afford it

**Phase 2 (Blackjack Betting):**
- `GameScreen.js` (Blackjack) — full three-state betting flow, Game Over modal

**Phase 3 (Save & Resume):**
- `GameScreen.js` (Blackjack) — save/resume hooks
- `SolitaireGameScreen.js` — save/resume hooks
- `LastCardGameScreen.js` — save/resume hooks
- `RummyGameScreen.js` — save/resume hooks
- `ConquianGameScreen.js` — save/resume hooks
- `PokerGameScreen.js` — save/resume hooks
- `GoFishGameScreen.js` — save/resume hooks
- `SolitaireVariantPickerScreen.js` — resume prompt before navigating
- `RummyVariantPickerScreen.js` — resume prompt before navigating
- `PokerVariantPickerScreen.js` — resume prompt before navigating
- `GameSetupScreen.js` — resume prompt before navigating
- `SinglePlayerSetupScreen.js` — resume prompt for Blackjack before navigating

## Files That Will Be Created

- `game/wallet.js` — global coin wallet helper (Phase 1)
- `game/gameSaves.js` — save/load helper for all single-player games (Phase 3)
- Optionally, a small reusable resume-prompt component or hook (Phase 3)

## Files That Must NOT Be Changed

- `game/conquian.js`, `game/poker.js`, `game/rummy.js`, `game/solitaire.js`, `game/lastCard.js`, `game/deck.js`
- `GameNetwork.js` (except minimal additions for buy-in broadcast in Phase 1c if absolutely necessary), `profile.js`, `responsive.js`, `cardTheme.js`
- `MultiplayerMenuScreen.js`, `SettingsScreen.js`
- `Card.js`, `VariantPicker.js`

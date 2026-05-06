# Card Night — Visual & Structural Update Prompt

## Overview

This update focuses on visual fixes, layout improvements, and restructuring how game settings (opponent count, difficulty) are presented to the player. No new games are being added. All existing gameplay logic stays the same unless explicitly noted.

**Tech Stack:** React Native + Expo, React Navigation (native-stack), portrait-only, responsive sizing via `game/responsive.js`.

---

## Changes to Make (in recommended build order)

---

### Change 1: Clean Up the Single Player Setup Screen (`SinglePlayerSetupScreen.js`)

**What to do:**

1. **Remove ALL opponent count, difficulty, and tone selectors** from this screen. This includes:
   - The "Computer Opponents" label + circle buttons (1, 2, 3) or stepper (+/−)
   - The "Difficulty" label + Easy / Medium / Hard buttons
   - The "Card Tone" selector (Family / Mature)
   - The empty `infoBox` that shows for Blackjack (lines ~403–406 — it renders an empty dark bar)
   - The "Single player only" `infoBox` that shows for Solitaire

2. **Remove Conquián from the carousel.** Delete the Conquián entry from both the `CAROUSEL_GAMES` array and the `GAMES` array. Conquián will now be accessed through the Rummy variant picker instead (see Change 6). **Do NOT delete** `ConquianGameScreen.js` or `game/conquian.js` — those stay exactly as they are.

3. **Simplify the Play button logic.** After removing settings, the Play button behavior for each game should be:
   - **Blackjack** → Navigate directly to `Game` screen (no settings needed)
   - **Solitaire** → Navigate to `SolitaireVariantPicker` (no settings needed)
   - **Rummy** → Navigate to `RummyVariantPicker` (settings will live there — see Change 5)
   - **Poker** → Navigate to `PokerVariantPicker` (settings will live there — see Change 5)
   - **Go Fish, Last Card** → Navigate to a NEW `GameSetupScreen` (see Change 2)

4. **The `buildSinglePlayerLaunchParams()` function** should be removed or simplified since opponent/difficulty are no longer chosen here. Each destination screen will build its own launch params.

5. **Keep everything else the same** — the carousel, dot indicators, "Playing as [name]" pill, and overall layout stay as-is. The screen should just be: carousel → dots → Play button. No gap/bar between the dots and the Play button.

---

### Change 2: Create a New Game Setup Screen (`GameSetupScreen.js`)

**Why:** Games without variants that still need opponent count and/or difficulty settings (Go Fish, Last Card) need somewhere for the player to configure those options before starting.

**What to build:**

Create a new screen called `GameSetupScreen.js` that:

- Receives the game info via route params (game ID, game name, screen name, AI range, whether it has difficulty)
- Shows the game name as a title at the top
- Shows a "Computer Opponents" selector (circle buttons for 1–3, or stepper +/− for games with more than 3 max opponents like Last Card which allows 1–7)
- Shows a "Difficulty" selector (Easy / Medium / Hard) if the game uses difficulty
- Shows a "Play [Game Name]" button at the bottom
- Uses the same dark theme and styling as the variant picker screens (`backgroundColor: '#1a1a2e'`, same button styles, same fonts)

**Games that use this screen:**
- **Go Fish** — opponents: 1–3, difficulty: yes
- **Last Card** — opponents: 1–7, difficulty: yes

**Games that do NOT use this screen:**
- Blackjack (no settings needed, goes straight to game)
- Solitaire (no settings needed, goes to variant picker then straight to game)
- Rummy (settings added to variant picker — Change 5)
- Poker (settings added to variant picker — Change 5)

**Register this screen** in `App.js` navigation.

---

### Change 3: Add Opponent/Difficulty Settings to Variant Picker Screens

**What to do:**

For **Rummy** (`RummyVariantPickerScreen.js`) and **Poker** (`PokerVariantPickerScreen.js`), add opponent count and difficulty selectors directly on the variant picker screen, below the variant list.

**Rummy variant picker additions:**
- After the variant list, add a "Computer Opponents" selector (1–3 circle buttons)
- Add a "Difficulty" selector (Easy / Medium / Hard)
- The "Play [Variant Name]" button at the bottom should pass opponent count and difficulty as part of the launch params
- **Exception: Conquián** — when Conquián is the selected variant, show opponents 1–3 and difficulty (same as it currently has)

**Poker variant picker additions:**
- After the variant list, add a "Computer Opponents" selector (1–3, since Poker currently supports 1–3 AI)  
- Add a "Difficulty" selector (Easy / Medium / Hard)
- The play button should pass these as launch params

**Solitaire variant picker** — no changes needed. Solitaire is single-player only, no opponents or difficulty.

**Styling:** Match the existing look of each picker screen. The opponent/difficulty selectors should use the same button styles as the current `SinglePlayerSetupScreen` (circle buttons for opponent count, rectangular buttons for difficulty).

---

### Change 4: Last Card Hand Layout — Grid Instead of Horizontal Scroll (`LastCardGameScreen.js`)

**Current behavior:** The player's hand is displayed in a single horizontal scrolling row.

**New behavior:** Display the player's hand in a **grid layout**:
- **5 cards per row**
- Cards wrap to the next row if the player has more than 5
- The hand area should be **vertically scrollable** if there are many rows
- Playable cards should still be visually highlighted the same way they currently are
- Card sizing should remain the same — just the layout changes from a horizontal row to a wrapped grid

**Implementation hint:** Replace the horizontal `ScrollView` / `FlatList` for the hand with a `View` using `flexDirection: 'row'` and `flexWrap: 'wrap'`, inside a vertical `ScrollView` if needed.

---

### Change 5: Fix Solitaire Card Spacing

#### 5a: FreeCell — Space Out the 8 Columns

**Problem:** The 8 tableau columns in FreeCell are too cramped — cards are touching or nearly touching each other horizontally.

**Fix:** Add more horizontal spacing between the 8 columns. Use the Klondike variant's column spacing as the reference — Klondike's 7 columns have good breathing room between them. FreeCell has 8 columns so each column will be slightly narrower, but the gaps between columns should feel similar to Klondike.

**Important:** Only adjust horizontal spacing between columns. Don't change the vertical card overlap within columns.

#### 5b: TriPeaks — Fix Pyramid Spacing

**Problem:** The pyramid/triangle layout in TriPeaks has cards that are too spread apart, making the pyramid shape look loose and messy.

**Fix:** Tighten the horizontal and vertical spacing so the pyramid looks compact and clean. Cards in each row should overlap slightly horizontally (like a typical TriPeaks layout), and rows should be closer together vertically.

#### 5c: Pyramid — Fix Pyramid Spacing

**Problem:** Same as TriPeaks — the pyramid layout cards are too spread out.

**Fix:** Same approach — tighten horizontal and vertical spacing for a compact, clean pyramid shape. Cards should overlap slightly horizontally within each row.

**All spacing changes are in `SolitaireGameScreen.js`.**

---

### Change 6: Move Conquián into the Rummy Variant Picker

**What to do:**

1. **Add Conquián as a variant** in the Rummy variant picker (`RummyVariantPickerScreen.js`). Add it to the variant list with:
   - Name: "Conquián"
   - Description: "Classic Mexican rummy — meld 9 cards to win." (or similar brief description)
   - It should appear as the last option in the list (after Canasta)

2. **When Conquián is selected and Play is tapped**, navigate to `ConquianGame` screen (same screen name it currently uses), passing the same launch params it currently receives (opponents, difficulty, player info).

3. **Do NOT change** `ConquianGameScreen.js` or `game/conquian.js` — the gameplay, layout, and logic stay exactly the same.

4. **Update the Rummy carousel card** in `SinglePlayerSetupScreen.js`:
   - Change the tag from `"4 classic modes"` to `"5 classic modes"`
   - Conquián was already removed from the carousel in Change 1

5. **Update `App.js`** if needed to ensure the Conquián route is still registered and reachable from the Rummy picker.

---

### Change 7: Collapsible Header for Rummy Game Screen (`RummyGameScreen.js`)

**What to do:**

The top info section of the Rummy game screen (showing variant name, description, round/stock/discard/deadwood stats, and turn instructions) should be **collapsible** with a SHOW/HIDE toggle button — matching how the Solitaire game screen (`SolitaireGameScreen.js`) already does it.

**Applies to all Rummy variants:** Gin Rummy, Rummy 500, Indian Rummy, Canasta (and Conquián when accessed through its own screen stays unchanged).

**Implementation:** Look at how `SolitaireGameScreen.js` implements its collapsible header and follow the same pattern:
- Default state: collapsed (hidden)
- Toggle button text: "SHOW" when collapsed, "HIDE" when expanded
- Smooth transition if Solitaire uses one; otherwise a simple show/hide is fine

---

### Change 8: Fix All Poker Variants (`PokerGameScreen.js`)

**Problem:** The current `PokerGameScreen.js` was rewritten to support multiple variants (Texas Hold'em, Omaha, Five Card Draw, Seven Card Stud), but the rewrite broke the layout and gameplay quality that the original Texas Hold'em version had.

**What to do:**

Use the **old `PokerGameScreen.js`** (provided separately — 646 lines, Texas Hold'em only) as the reference for layout, gameplay flow, and styling. The old version has:

- A clean banner showing whose turn it is and the current phase
- A "last action" display
- A community cards section with pot amount and card placeholders
- Player cards showing name, chips, bet, fold/all-in status
- "Your Cards" section showing hole cards
- Action buttons: Fold, Check/Call, and multiple Raise options
- Next Hand button at showdown
- Clean styling with proper use of `scale()` and `scaleFont()` from `game/responsive.js`

**Rebuild `PokerGameScreen.js` so that:**

1. **Texas Hold'em** uses the old layout and logic almost exactly (the old file IS Texas Hold'em)
2. **Omaha** uses the same layout — the only difference is 4 hole cards instead of 2, and hand evaluation uses exactly 2 hole cards + 3 community cards
3. **Five Card Draw** uses the same layout but:
   - No community cards section (hide it or show "No community cards" placeholder)
   - After the initial deal, players select cards to discard and draw replacements
   - Add a card selection UI for the draw phase (tap cards to select for discard, then a "Draw" button)
4. **Seven Card Stud** uses the same layout but:
   - No community cards section
   - Players receive cards in rounds (2 down, 4 up, 1 down)
   - Show face-up cards for each player in their player card section

**Keep the existing `game/poker.js`** logic file — it already has the variant-specific functions (`getPokerVariantConfig`, `dealPokerVariantHands`, `evaluatePokerVariantHand`, etc.). Wire the old-style UI to call these functions based on the selected variant.

**The variant is passed via route params** (e.g., `route.params.variant`). Use this to determine which layout adjustments to make.

**Multiplayer support:** The old file already has the host/client pattern with `setServerListeners`, `setClientListeners`, `broadcastToClients`, etc. Maintain this same pattern for all variants.

---

## Important Notes

- **Do NOT change any game logic** unless explicitly stated above. All rule engines (`game/deck.js`, `game/conquian.js`, `game/poker.js`, `game/rummy.js`, `game/solitaire.js`, `game/lastCard.js`) stay as-is.
- **Do NOT change the multiplayer networking** (`GameNetwork.js`) or profile system (`profile.js`).
- **Do NOT change the Home Screen**, Multiplayer Menu, Settings, or any other screens not mentioned above.
- **Test each change independently** before moving to the next one. The changes are ordered so that earlier changes don't depend on later ones.
- **Preserve responsive sizing** — continue using `scale()` and `scaleFont()` from `game/responsive.js` and `useWindowDimensions()` where appropriate.
- **Keep the same dark theme** (`#1a1a2e` background, `#16213e` cards, `#e94560` accent, etc.) across all new and modified screens.

---

## Files That Will Be Modified

- `SinglePlayerSetupScreen.js` — remove settings, remove Conquián, simplify Play button
- `RummyVariantPickerScreen.js` — add opponent/difficulty selectors, add Conquián variant
- `PokerVariantPickerScreen.js` — add opponent/difficulty selectors
- `LastCardGameScreen.js` — change hand layout to 5-per-row grid
- `SolitaireGameScreen.js` — fix FreeCell, TriPeaks, and Pyramid spacing
- `RummyGameScreen.js` — add collapsible header
- `PokerGameScreen.js` — rebuild using old file as reference, support all 4 variants
- `App.js` — register new `GameSetup` screen

## Files That Will Be Created

- `GameSetupScreen.js` — new pre-game setup screen for Go Fish, Last Card

## Files That Must NOT Be Changed

- `game/conquian.js`, `game/poker.js`, `game/rummy.js`, `game/solitaire.js`, `game/lastCard.js`, `game/deck.js`
- `ConquianGameScreen.js` (gameplay stays exactly the same)
- `GameNetwork.js`, `profile.js`, `responsive.js`, `cardTheme.js`
- `HomeScreen.js`, `MultiplayerMenuScreen.js`, `SettingsScreen.js`, `ProfileScreen.js`
- `Card.js`, `VariantPicker.js`

## Reference File

The old `PokerGameScreen.js` (646 lines, Texas Hold'em only) is provided as a separate file. Use it as the layout and gameplay reference for Change 8.

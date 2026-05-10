I'm continuing polish work on my Card Night app. The work below comes from a
review session in claude.ai chat where Pedro screenshotted issues and made
revisions to earlier polish work.

Read PROJECT_NOTES.md first for project context.

This is a UI POLISH + STANDARDIZATION pass. The two big themes:

1. Standardize a header bar across ALL game screens
2. Replace the floating QuitButton with a hamburger menu in that header

There are also targeted fixes for the EndOfRoundModal rollout, the
tableThemes.js foundation file (which was missed in the previous polish pass),
and Solitaire-specific bugs.

═══════════════════════════════════════════════════════════════════════════
RULES FOR THIS SESSION
═══════════════════════════════════════════════════════════════════════════

- Commit to git BEFORE starting each item ("pre-{item-id} snapshot").
- Do items ONE AT A TIME. After each: commit, then PAUSE and tell me what
  to test on my phone before moving on.
- I'm a beginner. Explain what each change does in plain language.
- All items are JS-only. NO new native packages. NO EAS rebuild.
- DO NOT touch GameScreen.js's card sizeScale (currently 1) — keep all
  Card components at sizeScale={1} where they are now.
- For ambiguous decisions, STOP and ASK before making them.
- When the whole block is done, update PROJECT_NOTES.md with a summary.

═══════════════════════════════════════════════════════════════════════════
ITEMS — IN ORDER
═══════════════════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────────────────
R1 — Create game/tableThemes.js (foundation that was missed in last pass)
──────────────────────────────────────────────────────────────────────────

The previous polish prompt asked for this central file but it was never
created. Multiple game screens still hardcode their table colors. Create
it now and use it as the single source of truth.

Create `game/tableThemes.js`:

export const TABLE_THEMES = {
blackjack: { table: "#35654D", accent: "#FFD700" },
poker: { table: "#35654D", accent: "#FFD700" },
solitaire: { table: "#01889F", accent: "#7FB3FF" },
rummy: { table: "#B22222", accent: "#FFE4B5" },
conquian: { table: "#B22222", accent: "#FFE4B5" },
gofish: { table: "#0D6E8C", accent: "#A8E6FF" },
lastcard: { table: "#1a1a2e", accent: "#e94560" },
wildround: { table: "#1a1a2e", accent: "#e94560" },
};

export function getTableTheme(gameId) {
return TABLE_THEMES[gameId] || TABLE_THEMES.blackjack;
}

Then update GameScreen.js (currently #08401f) and PokerGameScreen.js
(currently #0a1628) to import getTableTheme and use the proper colors. The
other game screens already have correct-ish colors but should also be
refactored to import from tableThemes.js — no more hardcoded table-bg
hex codes anywhere in screen files.

──────────────────────────────────────────────────────────────────────────
R2 — Build GameHeader component (the standardized header bar)
──────────────────────────────────────────────────────────────────────────

Create `components/GameHeader.js`. This is the dark rounded header card
that already appears on Solitaire and Rummy. Standardize it for ALL games.

VISUAL (match the existing Solitaire/Rummy style):

- Dark navy background (#0F1B2D or similar — match the existing one)
- Rounded corners (~scale(16))
- Sits at the top of the game screen with horizontal padding
- Two-zone layout: LEFT side (game info) + RIGHT side (menu button)

PROPS:

- gameId: string (required) — e.g., "blackjack" — used to pull accent color
  from tableThemes.js for the kicker text
- title: string (required) — main game name, e.g., "BLACKJACK", "SOLITAIRE"
- subtitle: string (optional) — variant, e.g., "Klondike", "Gin Rummy",
  or status info like "Free Play"
- leftInfo: ReactNode (optional) — for things like coin balance + bet:
  if provided, REPLACES title/subtitle on the left side. This is how
  Blackjack shows "🪙 750 Bet: 250" instead of "BLACKJACK / Klondike"
- extraButton: ReactNode (optional) — for Solitaire's SHOW button.
  Renders BETWEEN the leftInfo and the menu button.
- menuItems: array (required) — the hamburger menu items (R3 below)

LAYOUT:

- The header should NOT overlap with anything below it — the game screen's
  main content sits below this header with proper spacing.
- Use scale() / scaleFont() for all dimensions.
- The kicker (small label above title, e.g., "SOLITAIRE") should pull its
  color from getTableTheme(gameId).accent so each game's header has its
  own subtle accent color matching its table.

Example use:
<GameHeader
gameId="solitaire"
title="Solitaire"
subtitle="Klondike"
extraButton={<TouchableOpacity ...>SHOW</TouchableOpacity>}
menuItems={menuItems}
/>

<GameHeader
gameId="blackjack"
leftInfo={
<View>
<Text>🪙 {coins}</Text>
<Text>Bet: {currentBet}</Text>
</View>
}
menuItems={menuItems}
/>

──────────────────────────────────────────────────────────────────────────
R3 — Build GameMenu component (the hamburger dropdown)
──────────────────────────────────────────────────────────────────────────

Create `components/GameMenu.js`. This replaces the floating QuitButton.

VISUAL:

- Hamburger icon (☰) — single TouchableOpacity in the right side of GameHeader
- When tapped: opens a small dropdown menu (Modal with a translucent
  backdrop)
- Menu items are a vertical list of TouchableOpacity rows with icon + label
- Tap outside the menu (on the backdrop) to close
- Quit Game appears at the bottom, separated by a divider line

DEFAULT MENU ITEMS (in this order):

1. 🔄 Restart Game — calls onRestart prop, with confirmation Alert
2. 📖 How to Play — calls onHowToPlay prop, navigates to HowToPlay
   with the current gameId so the right rules
   are shown
3. 🔊 Sound: On / Off — toggles a global sound mute (see R4 below)
4. 🎨 Card Theme — navigates to CardTheme screen
   ─────────────────────────── (divider)
5. ❌ Quit Game — calls onQuit prop, with confirmation Alert

PROPS:

- onRestart: function — confirmation: "Restart? Current progress will be lost."
- onHowToPlay: function (or just gameId for built-in nav)
- onQuit: function — confirmation: "Quit this game? Your progress will be lost."
- extraItems: array (optional) — game-specific menu items inserted at the
  TOP of the menu (Solitaire passes "Show Solution" here)

For Solitaire specifically, pass `extraItems={[{ icon: '👁', label: 'Show Solution', onPress: ... }]}`

Sound preference persists in AsyncStorage so it survives app restarts.

──────────────────────────────────────────────────────────────────────────
R4 — Sound toggle wiring
──────────────────────────────────────────────────────────────────────────

The Sound: On/Off menu item needs to actually mute/unmute. Update
`game/sounds.js` to support a global mute flag:

- Add a module-level `_muted` boolean
- Add setMuted(value) that updates the flag and persists to
  AsyncStorage at @cardnight:soundMuted
- Add getMuted() that returns the cached flag
- On app launch (in App.js or sounds.js init), load the persisted value
- Update playSound() to early-return if \_muted === true

In GameMenu.js, the sound toggle reads getMuted() to decide its label and
calls setMuted(!getMuted()) on tap. Use a small useState hook to force
re-render of the menu when toggled.

──────────────────────────────────────────────────────────────────────────
R5 — Replace QuitButton with GameHeader + GameMenu on every game screen
──────────────────────────────────────────────────────────────────────────

For each of these screens:

- GameScreen.js (Blackjack)
- MultiplayerGameScreen.js (Blackjack multiplayer)
- GoFishGameScreen.js
- ConquianGameScreen.js
- PokerGameScreen.js
- SolitaireGameScreen.js
- RummyGameScreen.js
- LastCardGameScreen.js
- WildRoundGameScreen.js

Do this:

1. Remove the existing <QuitButton /> JSX
2. Add <GameHeader gameId="..." ... /> at the top of the main return
3. Pass appropriate menuItems
4. For betting/coin-tracking games (Blackjack, Poker), use the leftInfo
   prop to show coins + bet/pot inline in the header
5. For Solitaire: use the existing variant title pattern + pass SHOW as
   extraButton
6. Restart Game logic is per-game — pass an onRestart callback that
   resets the game state to a fresh deal with the same settings

The existing standalone QuitButton.js component can be DELETED at the end
since nothing uses it anymore. Verify no other file imports it before
deleting.

──────────────────────────────────────────────────────────────────────────
R6 — Wire EndOfRoundModal into all remaining game screens
──────────────────────────────────────────────────────────────────────────

The EndOfRoundModal works beautifully on Blackjack (single player) — Pedro
confirmed via screenshot. Roll out the same pattern to all other game
screens that don't have it yet.

For each screen, find where the round/game ends today (currently shows
inline win/loss banner or auto-advances) and replace with the
EndOfRoundModal:

- GoFishGameScreen.js → Continue + Leave (no Adjust Bet, no betting)
- ConquianGameScreen.js → Continue + Leave
- RummyGameScreen.js → Continue + Leave
- LastCardGameScreen.js → Continue + Leave
- WildRoundGameScreen.js → Continue + Leave
- SolitaireGameScreen.js → Continue + Leave (Continue = new game)
- PokerGameScreen.js → Continue + Adjust Buy-In + Leave (this is
  a betting game, so include adjust)
- MultiplayerGameScreen.js → Continue + Leave (no Adjust Bet in MP)

BUTTON BEHAVIOR PER GAME:

- "Continue" = start a new round/hand/game with same settings
- "Adjust Bet" (Poker only) = return to buy-in selection screen
- "Leave" = same as menu's Quit Game (use the same handler)

WHEN IT APPEARS:

- Round end (small modal, isGameOver=false)
- Game over / out of coins (large modal, isGameOver=true, no Continue)

──────────────────────────────────────────────────────────────────────────
R7 — Solitaire bug fixes
──────────────────────────────────────────────────────────────────────────

Two specific issues from screenshot review:

ISSUE A: "Waste" label is wrapping to two lines ("Wast" / "e")
In SolitaireGameScreen.js, find the styles for the slot labels in the
top row. The font size is too large for the slot width. Fix options
(pick the simplest that works visually): 1. Reduce font size for the top-row slot labels 2. Change "Waste" label to "W" or shorten it 3. Increase the width of the Waste slot specifically
Recommend option 1 — drop fontSize on those labels by 2-3 points.

ISSUE B: Empty tableau columns show plain "Empty" text instead of dashed slots
Currently when a column is emptied, it just shows "Empty" text. Should
match the dashed-border empty slots used at the TOP of the screen
(Waste, F1-F4 when empty). Same visual treatment so it's clear it's a
valid drop zone.

Find the `emptyColumnSlot` and `emptyColumnText` styles and change them
to mirror the existing top-row empty-slot styling — dashed border in
the same color, no "Empty" text needed (or much smaller "Empty" text
centered inside the dashed slot).

──────────────────────────────────────────────────────────────────────────
R8 — Restart Game implementation per game
──────────────────────────────────────────────────────────────────────────

The hamburger menu's "Restart Game" needs to actually work. For each game
screen, define an onRestart callback that:

- Shows a confirmation Alert: "Restart? Current progress will be lost."
- On confirm: clears the save (clearGame(SAVE_KEY)), resets all relevant
  state (hands, scores, dealer, etc.), and triggers a fresh deal with
  the same difficulty / variant / bet / buy-in
- For Blackjack: takes the player back to the betting screen with the
  same wallet — they pick a new bet
- For Poker: re-deals the current tournament (or returns to buy-in
  screen — ASK ME if unclear)
- For non-betting games: just re-deals and starts a new round/game

If implementing Restart for a specific game gets complex, STOP and ASK me
about that game before going further. We can ship Restart as a stub
(disabled menu item) for any game where it's nontrivial.

═══════════════════════════════════════════════════════════════════════════
ORDER OF EXECUTION
═══════════════════════════════════════════════════════════════════════════

Foundations first, then components, then rollout, then game-specific:

1. R1 — Create tableThemes.js + refactor hardcoded colors (20 mins)
2. R7 — Solitaire Waste label + empty slot fixes (15 mins, isolated)
3. R4 — Sound mute infrastructure (15 mins)
4. R3 — Build GameMenu component (45 mins)
5. R2 — Build GameHeader component (45 mins)
6. R5 — Roll out GameHeader + GameMenu to all screens (90 mins, biggest)
7. R8 — Implement Restart per game (60 mins)
8. R6 — Roll out EndOfRoundModal to remaining screens (90 mins)

After R8, update PROJECT_NOTES.md with a summary of all 8 items.

A note on R6 ordering: The EndOfRoundModal rollout COULD go before R5
(headers), but doing headers first means each game screen gets touched
once for the header refactor and we already know what the layout looks
like before we wire the modal in.

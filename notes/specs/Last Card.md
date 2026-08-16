---
verified: 2026-08-16
---

# 🎴 Last Card — Complete Game Spec

## Overview

Last Card is an Uno-style card game for 2–8 players. Players take turns matching the top card of the discard pile by color OR number. Special action cards shake up the turn order. First player to empty their hand wins.

Built into Card Night alongside the existing 5 games. Follows the same multiplayer pattern as all other Card Night games.

---

## Game Configuration

| Setting           | Value                                |
| ----------------- | ------------------------------------ |
| Players           | 2–8                                  |
| Starting hand     | 7 cards                              |
| Win condition     | First to empty hand                  |
| Turn direction    | Clockwise (Reverse card flips it)    |
| Draw rule         | Keep drawing until you can play      |
| Draw pile empty   | Shuffle discard pile → new draw pile |
| AI                | Single difficulty level              |
| "Last Card!" call | No penalty rule — just play it out   |

---

## The Deck

**Total: 108 cards**

| Card        | Per Color | × Colors | Total   |
| ----------- | --------- | -------- | ------- |
| 0           | 1         | × 4      | 4       |
| 1–9         | 2 each    | × 4      | 72      |
| Skip        | 2         | × 4      | 8       |
| Reverse     | 2         | × 4      | 8       |
| Draw 2      | 2         | × 4      | 8       |
| Wild        | —         | —        | 4       |
| Wild Draw 4 | —         | —        | 4       |
| **Total**   |           |          | **108** |

### Colors

Internal ids stayed as they were; the names players read were changed on
2026-08-03 (`COLOR_LABELS` in `LastCardGameScreen.js`) because a family game
shouldn't ask a child to say "OD Green".

| id          | shown as   | hex       |
| ----------- | ---------- | --------- |
| `od_green`  | **Green**  | `#556B2F` |
| `crimson`   | **Red**    | `#B92841` |
| `turquoise` | **Blue**   | `#40E0D0` |
| `coral`     | **Orange** | `#FF7F50` |

### Card Image Files

Stored in `assets/cards_lastcard/`. Naming convention:

```
Number cards:   {color}_{number}.png         e.g. od_green_0.png, crimson_7a.png
Skip:           {color}_skipa.png / skipb.png
Reverse:        {color}_reversea.png / reverseb.png
Draw 2:         {color}_draw2a.png / draw2b.png
Wild:           wild_1.png through wild_4.png
Wild Draw 4:    wild_draw4_1.png through wild_draw4_4.png
Card back:      card_back.png
```

---

## Action Cards — Rules

### Skip ⊘

- Next player in turn order loses their turn entirely.
- They draw nothing — they just sit out that turn.
- Play continues to the player after them.

### Reverse ⟲

- Flips the turn direction.
- If going clockwise → now counterclockwise, and vice versa.
- In a 2-player game: acts like a Skip (play returns to the same player).

### Draw 2 (+2)

- Next player must draw 2 cards AND loses their turn.
- Cannot be blocked or stacked (no Draw 2 chaining).
- If the draw pile doesn't have enough cards, reshuffle discard first.

### Wild

- Player who plays it chooses any color.
- Chosen color becomes the new active color.
- Next player must match that color OR play another Wild.

### Wild Draw 4 (+4)

- Player who plays it chooses any color.
- Next player must draw 4 cards AND loses their turn.
- **Legal restriction:** Should only be played when the player has no card matching the current color. In digital play, this is enforced automatically — the game will only allow Wild Draw 4 if no color match exists in hand.
- If no legal play exists at all, Wild Draw 4 can always be played.
- **This rule is deliberate — confirmed 2026-08-03.** A dimmed Wild +4 next to a
  bright colour match reads as a bug, and it isn't; without the restriction, +4
  is a no-downside attack you'd throw every turn. Plain **Wild is unrestricted**
  and never dims. The fix for the confusion is explaining the restriction (see
  Card Highlighting), not removing it.

---

## Turn Structure

Each turn follows this exact order:

1. **Check if player can play**
   - A card is playable if it matches the current color OR current number/type
   - Wild and Wild Draw 4 are always playable (with restriction above)

2. **If player CAN play:**
   - They select a card from their hand
   - Card is placed on discard pile
   - If Wild or Wild Draw 4 → color picker appears
   - Action card effects resolve immediately
   - Check win condition (hand empty = win)
   - Turn passes to next player

3. **If player CANNOT play:**
   - They draw one card from the draw pile
   - If drawn card is playable → they MAY play it immediately
   - If drawn card is not playable → draw again
   - Keep drawing until a playable card is drawn
   - Play that card, then turn passes

4. **Draw pile empty during drawing:**
   - Take all discard pile cards EXCEPT the top card
   - Shuffle them → new draw pile
   - Continue drawing

---

## Win Condition

First player to play their last card wins immediately. The round ends — no need to finish other players' turns.

If the draw pile AND discard pile are both empty and no player can play (extremely rare edge case) → declare a draw.

---

## UI Layout

### Game Screen (all players)

```
┌─────────────────────────────────┐
│  Player names + card counts     │  ← top bar, all opponents shown
│  (highlight active player)      │
├─────────────────────────────────┤
│                                 │
│     [DRAW PILE]  [TOP CARD]     │  ← center play area
│      ? cards     current card   │
│                                 │
│     Turn direction indicator    │  ← ↻ or ↺
│                                 │
├─────────────────────────────────┤
│  Your hand (horizontal scroll)  │  ← bottom, player's cards
│  [card][card][card][card]...    │
│                                 │
│  Playable cards highlighted     │  ← dim unplayable cards
└─────────────────────────────────┘
```

### Color Picker (shown after playing OR drawing Wild / Wild Draw 4)

- Full-screen overlay
- 4 large color buttons: Green / Red / Blue / Orange
- "Choose a color" prompt at top
- No dismiss — must pick a color to continue

Shown to **exactly one player**: whoever `awaitingColorChoiceBy` names. Both the
host and a client decide that with `owesColorChoice(state, myPid)` from
`game/lastCard.js`, reading the same field — the host off the full state, a
client off the broadcast. Drawing into a wild has to behave identically to
playing one: the host resolves the draw and auto-plays the wild, so the drawer
gets the picker without ever having tapped a card.

### Active Player Indicator

- Highlight the current player's name/avatar in the top bar
- Show a countdown or "YOUR TURN" banner when it's the local player's turn

### Card Highlighting

- Playable cards: full brightness
- Unplayable cards: dimmed to ~40% opacity (at every difficulty — seeing which
  cards are legal is a rules aid, not a strategy hint)
- Tapping an unplayable card: **nothing at all — no shake, no haptic, no text**

That silence is deliberate (**Pedro's call, 2026-08-03**, after playing it on a
device). The dimming already shows the legal set before you touch anything, so
scolding a player for a move the interface had told them not to make is noise.
The tap returns at `whyUnplayable(...)` in `onCardTap` and nothing else fires.

It briefly did shake + buzz + explain (2026-08-03). On device none of it
appeared, the cause was never found, and rather than keep a path that fails for
unknown reasons the silence was made explicit. **If you ever restore the
feedback, find out what was swallowing it first — don't assume it works.** The
shake animation, `triggerShake`, the `cardRejected` style and `unplayableText`
were all deleted with it; they're in git history if needed.

`whyUnplayable()` in `game/lastCard.js` survives, because two things still use
it: the **dimming**, and the **accessibility labels** — a screen reader still
announces why a card can't be played, since a blind player has no dimming to
read. It returns a code the screen turns into copy:

| code                    | when                                    | screen reader hears                                |
| ----------------------- | --------------------------------------- | -------------------------------------------------- |
| `no_match`              | wrong colour and wrong number/type      | "…, can't be played right now"                     |
| `draw4_has_color_match` | Wild +4 while a colour match is in hand | "…, can't be played — you still have a Green card" |

Wild +4 has to be its own case. It is the only card whose legality depends on
the rest of the hand, so the generic line would tell a player to play the very
card that is blocking them.

---

## Multiplayer Networking

Follows the standard Card Night host/client pattern:

**Host runs all logic:**

- Full game state in `fullRef`
- Validates all plays server-side
- Broadcasts `GAME_STATE` (public) after every action
- Sends `PRIVATE_HAND` to each player individually

**Public state includes:** (built by `toPublicState()` in `game/lastCard.js`)

- Draw pile count (not contents)
- Discard pile top card
- All player names + card counts
- Current active color (important for Wild)
- Whose turn it is
- Turn direction
- Any pending action (e.g. next player must draw 2)
- `awaitingColorChoiceBy` + `pendingWildCard` — who owes a colour, and for which
  card. A client cannot show a working picker without these; leaving them out is
  what froze the game when a client drew a wild.

**Private state includes:**

- Player's own hand (card details)

**Client actions (sent to host):**

```
PLAY_CARD    { cardId }
DRAW_CARD    { }
CHOOSE_COLOR { color }   ← after Wild
```

**Host broadcasts:**

```
GAME_STATE   { public state }
PRIVATE_HAND { cards[] }
GAME_OVER    { winner }
```

---

## AI Behavior (Single Difficulty)

AI plays a simple but reasonable strategy:

**Card selection priority (in order):**

1. Play a Wild Draw 4 if it's legal AND opponent has ≤ 2 cards
2. Play a Draw 2 if opponent has ≤ 3 cards
3. Play a Skip or Reverse if opponent has ≤ 3 cards
4. Play any number card that matches color (prefer color matches over number)
5. Play a Wild card and choose the color it has the most of in hand
6. Play any legal card (fallback)
7. Draw if nothing is playable

**AI turn delay:** 1.0–1.5 seconds (so humans can see what's happening)

**Color picker (AI Wild):**

- Always picks the color it has the most cards of in remaining hand
- Tiebreak: random

---

## Single Player Setup

Added to `SinglePlayerSetupScreen.js`:

- Game: Last Card
- Player count selector: 2–8 (includes AI opponents)
- AI fills remaining slots (e.g. 1 human + 3 AI = 4 players)
- AI difficulty: Simple (only one level for now)

---

## Project Integration

### New Files

```
game/lastCard.js                   ← pure game logic, no React
screens/LastCardGameScreen.js      ← single + multiplayer UI
assets/cards_lastcard/             ← 109 card images (already generated ✅)
```

### Modified Files

```
screens/SinglePlayerSetupScreen.js ← add Last Card to game list
screens/LobbyScreen.js             ← add Last Card to game selector
App.js                             ← register LastCardGameScreen
PROJECT_NOTES.md                   ← update after build
```

### Minimum player count

2 players (no minimum enforced in Lobby beyond the standard 2)

---

## Phased Build Plan

### Phase A — Game Logic

- `game/lastCard.js` with pure functions:
  - `createDeck()` — builds shuffled 108-card deck
  - `dealHands(players, handSize)` — deals 7 cards each
  - `isPlayable(card, topCard, activeColor)` — can this card be played?
  - `applyCard(state, card, chosenColor)` — resolves card effect, advances turn
  - `drawUntilPlayable(state, playerId)` — handles draw loop
  - `checkWin(state)` — returns winner or null
  - `reshuffleDeck(state)` — handles empty draw pile
  - `getAIMove(state, playerId)` — returns card to play + chosen color

### Phase B — Single Player UI

- `screens/LastCardGameScreen.js`
- Full game loop working vs AI
- Color picker overlay
- Card highlighting (playable vs dimmed)
- Win screen

### Phase C — Multiplayer

- Wire host/client networking
- Add to Lobby game selector
- Test on both phones with 2+ players

---

## Known Edge Cases to Handle

| Edge Case                                      | Resolution                          |
| ---------------------------------------------- | ----------------------------------- |
| Wild Draw 4 played illegally (has color match) | Block in UI — button disabled       |
| Draw pile runs out mid-draw                    | Reshuffle discard, continue drawing |
| Both piles empty                               | Declare draw                        |
| 2-player Reverse                               | Treat as Skip                       |
| Player disconnects mid-game                    | Host removes player, game continues |
| AI plays Wild Draw 4 on last card              | Valid win — AI empties hand         |

---

## Asset Summary

| Asset                  | Status                                     |
| ---------------------- | ------------------------------------------ |
| Card images (109 PNGs) | ✅ Generated — in `assets/cards_lastcard/` |
| Card back              | ✅ Generated                               |
| Game logic file        | 🔜 Phase A                                 |
| Game screen            | 🔜 Phase B                                 |
| Multiplayer            | 🔜 Phase C                                 |

# 📋 Conquián — Complete Build Spec

## ⚠️ Status: Rebuild

A previous Conquián implementation exists in this project but had bugs and is being scrapped entirely. This spec describes the desired final behavior. All previous Conquián code should be removed before starting this rebuild.

---

## Overview

A new multiplayer card game added to the existing Card Game app (alongside Blackjack, Go Fish, Poker). Mexican rummy variant with a unique "Priority Chain" mechanic.

## Project Integration

- **New game logic file:** `game/conquian.js`
- **New screen file:** `screens/ConquianGameScreen.js`
- **Add `'Conquian'` to the Lobby's game selector chip row**
- **Wire navigation** in `App.js`
- Follow the same multiplayer pattern as existing games (`fullRef`, `applyState`, `toPublic`, `PRIVATE_HAND` broadcasts)

## Game Configuration

| Setting          | Value                                      |
| ---------------- | ------------------------------------------ |
| Deck             | 1 deck × 40-card Mexican deck              |
| Ranks (10 total) | A, 2, 3, 4, 5, 6, 7, J, Q, K (NO 8, 9, 10) |
| Suits            | ♠ ♥ ♦ ♣                                    |
| Players          | 2-4 only                                   |
| Win condition    | First to meld `Hand Size + 1` cards        |

## Player Scaling

| Players | Starting Hand | Win Target |
| ------- | ------------- | ---------- |
| 2       | 10 cards each | 11 melded  |
| 3       | 8 cards each  | 9 melded   |
| 4       | 7 cards each  | 8 melded   |

## Sequence Logic (for Runs)

```
Position:    1  2  3  4  5  6  7  8  9  10
Card rank:   A  2  3  4  5  6  7  J  Q  K
```

- Map `J=8, Q=9, K=10` internally for sequence math
- Ace is **always low** — no King→Ace wraparound
- Runs can be 3, 4, 5, ..., or all 10 cards
- 7-J is a valid consecutive pair

## Meld Types

**Set:** 3 or 4 cards of the same rank, all different suits.

**Run:** 3+ cards of the same suit in consecutive order (per the table above).

## Setup

- **First game's dealer:** Random
- **Subsequent games' dealer:** Winner of the previous game
- **First player:** Player to dealer's left (clockwise)
- **Dead Pile (= Discard Pile) starts EMPTY**
- After dealing, Stock = remaining cards face down

## Initial Card Pass (start of every game)

After dealing and BEFORE the first player draws, every player participates in a **simultaneous blind pass:**

1. Each player picks one card from their hand (blind — they don't know what's coming)
2. All players pass their chosen card to the next player **clockwise** at the same time
3. All players receive the new card and add it to their hand (it's now a normal hand card)
4. Only AFTER all passes complete does the first player draw from Stock

This happens at the start of **every** game in a session, not just the first one.

**UI implication:** The game needs a brief "Initial Pass" phase between dealing and the first turn. All players need a "Pick a card to pass" prompt simultaneously.

## Turn Flow

### YOUR DRAW TURN (you're the original drawer)

1. Draw top card from Stock to Active Slot
2. (Optional) Lay down new melds from your hand
3. (Optional) Extend your OWN existing melds with hand cards
4. Decide on the Active Card:
   - **TAKE:** place active card into a valid meld (with optional borrowing) → must DISCARD one card → Discard starts the chain (EXCEPTION: if this take wins the game, no discard needed)
   - **PASS:** Active card starts the chain (no discard, no further melds beyond steps 2-3)

### CHAIN OFFER (someone else's discard offered to you)

1. Decide on the offered card:
   - **TAKE:** place card into a valid meld (with optional borrowing) → must DISCARD one card from hand → New discard starts a new chain (NO extra hand melds — only on your draw turn) (EXCEPTION: if this take wins the game, no discard needed)
   - **PASS:** card moves to next eligible player (cannot lay down or extend anything)

**Key principle:** Free melding from hand happens ONLY at the start of your own draw turn.

## "Take" Rule

Taking the active card always means: **"I'm placing this card into a valid meld on the table right now."** It cannot just go to the player's hand.

## Priority Chain — Detailed

- Active card moves clockwise to the **next eligible player**
- A player **cannot be offered** a card if:
  1. They are the one who just put it in the Active Slot (passed from Stock OR discarded after melding), OR
  2. They have already passed on THIS specific card during this same chain
- A player CAN be offered a different card even if they passed on a previous one in the same turn (passes are per-card, not "out for the turn")
- **When everyone eligible has passed and the chain hits a wall** → card goes to the **Dead Pile**
- **The "official turn" advances to the next-clockwise from the ORIGINAL DRAWER** when the Dead Pile triggers — no matter how long the chain was

## Borrowing Rule

When taking a card (active slot or chain offer), a player may rearrange their **own** existing melds.

**Allowed:**

- Move cards between own melds (multiple at once is fine)
- Combine borrowed cards with hand cards and the taken card
- Reduce a 4-card meld to a 3-card meld (still valid)

**NOT allowed:**

- Touching another player's melds
- Leaving any meld in an invalid state (every meld on the table must still be a valid set or run after the rearrangement)

**Example:**

- Player has set `7♠, 7♥, 7♦, 7♣` on table, `5♥` in hand, taking `6♥`
- Pull `7♥` out → combine with `5♥` + `6♥` → new run `5♥, 6♥, 7♥`
- Original set becomes `7♠, 7♦, 7♣` (still valid)

## Win Condition

A player wins immediately when they meld cards equal to `hand size + 1`.

### Standard Win

- Player has multiple cards still in hand
- They meld during their turn or chain take, reaching the target
- Game ends instantly — chain stops, no discard, even if mid-chain

### Final-Card Win (edge case)

- Player has only 1 card left in hand, has already melded `hand size` cards
- The active card (drawn from Stock or offered from chain) can be added to an existing table meld → reaches `hand size + 1` total
- **They meld it and win immediately**
- **No discard required** (their hand would be empty after, plus the game has ended)
- **No new chain triggers** — game stops here

### Why this only works one way

When holding only 1 card, you cannot form a brand-new 3-card meld (only 2 cards available: your last hand card + active card). The only win path with 1 card left is **extending an existing table meld with the active card**.

## End Conditions

- **Win:** See Win Condition section above
- **Tie:** Stock is empty AND the current chain has ended without a winner → trigger Tie/Draw screen
- **No reshuffling** — once Stock is empty, the game heads toward a tie
- **No scoring** — only Win or Tie

## AI Behavior (Single-Player Mode)

- **Single difficulty level for v1** (Easy/Medium/Hard variants can come later)
- **Pass rate ~15%** when a card is takeable — gives "humanlike" feel without seeming dumb
- **AI never borrows** — only takes if it can place the card in a valid meld with simple add or new meld from hand
- **Discard logic:** AI discards isolated cards first (no same-rank in hand AND no adjacent-rank-same-suit in hand). If everything is connected, falls back to highest unconnected card.
- **Initial Pass card choice:** AI passes its most isolated card (same logic as discard)

## UI Requirements

- **Layout:** Stacked — other players' info at top, your hand at bottom, table center
- **Hand sort:** Drag-and-drop manual reorder using `react-native-draggable-flatlist`
- **Meld interaction:** Multi-select cards in hand → tap "Meld" button → system validates and places
- **Active Slot:** Central UI area showing the current chain card
- **Meld Counter:** Show "7/9" style indicator next to each player's avatar (cards melded / target)
- **Turn indicator:** Visual highlight (glow/border) AND text label ("Pedro's Turn")
- **Take/Pass buttons:** Appear only when you're being offered the active card
- **Borrow controls:** When taking, allow tapping cards in your existing melds to "pull out" + reassign
- **Stock Pile / Dead Pile / Active Slot:** All visible to everyone
- **Invalid meld attempts:** Show error message ("Invalid meld") — silent rejection feels broken
- **Initial Pass UI:** Each player gets a "Pick a card to pass" prompt at game start. After all players have selected, all passes happen simultaneously, then players see the new card they received before play begins.

## Dependencies

`react-native-draggable-flatlist` — already installed.

## Phased Build Plan

### Phase A: Single-player vs simple AI (no Priority Chain, no borrowing)

- Deck creation (40 cards)
- Meld validator (sets + runs with 7-J special case)
- Initial Card Pass mechanic (player + AI)
- Basic draw → meld OR pass → discard loop
- AI plays simply per AI Behavior spec
- Win + final-card-win + tie detection
- **Goal: prove meld engine + turn loop works**

### Phase B: Add the Priority Chain (still single-player vs AI)

- Multiple players in chain, manual Take/Pass
- Chain reactions when someone takes
- Dead pile when everyone passes
- "Cannot be offered same card twice" rule
- "Turn ends at Dead Pile, advance from original drawer" rule
- **Goal: prove the chain mechanic**

### Phase C: Add Borrowing (full single-player Conquián)

- UI for moving cards between own melds
- Validator for final-state legality
- Active card MUST end up in some meld
- **Goal: full single-player Conquián**

### Phase D: Multiplayer

- Add `ConquianGameScreen.js` following existing pattern
- `fullRef` / `applyState` / `PRIVATE_HAND`
- Multiplayer Initial Card Pass (all players pick simultaneously, then resolved by host)
- Add to Lobby's game selector
- Test on both phones
- **Goal: real multiplayer Conquián**

### Phase E: Polish (optional)

- Card-table edge layout (instead of stacked)
- Smoother animations
- Better tie screen
- Sound effects
- AI difficulty levels (Easy/Medium/Hard)
- 5-6 player + 2-deck support if you ever want it

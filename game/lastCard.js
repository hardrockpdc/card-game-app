// game/lastCard.js — Pure Last Card (Uno-style) game logic, no React or UI.
//
// State shape used by applyCard / drawCard / etc.:
// {
//   drawPile:      Card[],                  — cards to draw from (top = index 0)
//   discardPile:   Card[],                  — top card is last element
//   hands:         { [playerId]: Card[] },
//   players:       string[],                — ordered player ids (clockwise)
//   currentTurn:   string,                  — id of player who acts next
//   turnDirection: 1 | -1,                  — 1 = forward through players array
//   activeColor:   string,                  — current required color
//   pendingDraw:   number,                  — cards currentTurn must draw (0 = none)
//   skippedPlayer: string | null,           — last skipped player (UI hint only)
// }

export const COLORS = ['od_green', 'crimson', 'turquoise', 'coral'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds and returns a shuffled 108-card Last Card deck.
// Each card: { id, color, type, value }
// type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4'
export function createDeck() {
  const cards = [];
  let id = 0;

  for (const color of COLORS) {
    // One 0, two each of 1–9
    cards.push({ id: id++, color, type: 'number', value: 0 });
    for (let v = 1; v <= 9; v++) {
      cards.push({ id: id++, color, type: 'number', value: v });
      cards.push({ id: id++, color, type: 'number', value: v });
    }
    // Two Skip, two Reverse, two Draw 2
    for (let i = 0; i < 2; i++) {
      cards.push({ id: id++, color, type: 'skip',    value: null });
      cards.push({ id: id++, color, type: 'reverse', value: null });
      cards.push({ id: id++, color, type: 'draw2',   value: null });
    }
  }

  // 4 Wild, 4 Wild Draw 4 (no color)
  for (let i = 0; i < 4; i++) {
    cards.push({ id: id++, color: null, type: 'wild',       value: null });
    cards.push({ id: id++, color: null, type: 'wild_draw4', value: null });
  }

  return shuffle(cards); // 108 cards total
}

// Deals handSize cards to playerCount players.
// Player ids are generated as '0', '1', … '(playerCount-1)'.
// Returns { hands: { playerId: Card[] }, remainingDeck: Card[] }.
export function dealHands(deck, playerCount, handSize = 7) {
  const deckCopy = [...deck];
  const hands = {};

  for (let i = 0; i < playerCount; i++) {
    hands[String(i)] = deckCopy.splice(0, handSize);
  }

  return { hands, remainingDeck: deckCopy };
}

// Returns true if card can legally be played on topCard given activeColor.
// hasColorMatch: true when the player holds at least one card matching activeColor;
// Wild Draw 4 is only legal when no such card exists (pass hasColorMatch from caller).
export function isPlayable(card, topCard, activeColor, hasColorMatch = false) {
  if (card.type === 'wild') return true;
  if (card.type === 'wild_draw4') return !hasColorMatch;

  // Same color as active color
  if (card.color === activeColor) return true;

  // Action card played on same action type (Skip on Skip, Draw2 on Draw2, etc.)
  if (card.type !== 'number' && card.type === topCard.type) return true;

  // Number card played on same number
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;

  return false;
}

// Applies card's effect and advances the turn; returns a new state object (no mutation).
// chosenColor must be provided when card.type is 'wild' or 'wild_draw4'.
export function applyCard(state, playerId, card, chosenColor = null) {
  const { players, turnDirection, hands } = state;
  const playerIndex = players.indexOf(playerId);
  const playerCount = players.length;

  // n steps forward in the current turn direction, wrapping around
  const nextInDir = (n) =>
    players[((playerIndex + n * turnDirection) % playerCount + playerCount) % playerCount];

  const newHand        = hands[playerId].filter(c => c.id !== card.id);
  const newDiscardPile = [...state.discardPile, card];
  const newActiveColor = (card.type === 'wild' || card.type === 'wild_draw4')
    ? chosenColor
    : card.color;

  let newTurnDirection = turnDirection;
  let newCurrentTurn;
  let newPendingDraw   = 0;
  let newSkippedPlayer = null;

  switch (card.type) {
    case 'number':
    case 'wild':
      newCurrentTurn = nextInDir(1);
      break;

    case 'skip':
      // Skip the immediate next player; go to the one after
      newSkippedPlayer = nextInDir(1);
      newCurrentTurn   = nextInDir(2);
      break;

    case 'reverse':
      newTurnDirection = -turnDirection;
      if (playerCount === 2) {
        // 2-player Reverse acts as Skip: same player goes again
        newSkippedPlayer = nextInDir(1);
        newCurrentTurn   = playerId;
      } else {
        // Next player in the new (reversed) direction
        const idx = ((playerIndex + newTurnDirection) % playerCount + playerCount) % playerCount;
        newCurrentTurn = players[idx];
      }
      break;

    case 'draw2':
      // Next player receives pendingDraw = 2 and loses their turn
      newCurrentTurn = nextInDir(1);
      newPendingDraw  = 2;
      break;

    case 'wild_draw4':
      newCurrentTurn = nextInDir(1);
      newPendingDraw  = 4;
      break;

    default:
      newCurrentTurn = nextInDir(1);
  }

  return {
    ...state,
    discardPile:   newDiscardPile,
    hands:         { ...hands, [playerId]: newHand },
    activeColor:   newActiveColor,
    currentTurn:   newCurrentTurn,
    turnDirection: newTurnDirection,
    pendingDraw:   newPendingDraw,
    skippedPlayer: newSkippedPlayer,
  };
}

// Draws one card from drawPile for playerId; reshuffles discard pile if drawPile is empty.
// Returns { state, drawnCard } — drawnCard is null when both piles are exhausted.
export function drawCard(state, playerId) {
  let s = state.drawPile.length === 0 ? reshuffleDeck(state) : state;

  if (s.drawPile.length === 0) {
    return { state: s, drawnCard: null };
  }

  const [drawnCard, ...remainingDraw] = s.drawPile;

  return {
    state: {
      ...s,
      drawPile: remainingDraw,
      hands: {
        ...s.hands,
        [playerId]: [...s.hands[playerId], drawnCard],
      },
    },
    drawnCard,
  };
}

// Shuffles all discard pile cards except the top card into a new draw pile.
export function reshuffleDeck(state) {
  if (state.discardPile.length <= 1) return state;

  const topCard    = state.discardPile[state.discardPile.length - 1];
  const toReshuffle = state.discardPile.slice(0, -1);

  return {
    ...state,
    // Merge any remaining draw pile cards (edge case) with reshuffled discard
    drawPile:    shuffle([...state.drawPile, ...toReshuffle]),
    discardPile: [topCard],
  };
}

// Returns the playerId whose hand is empty (winner), or null if no winner yet.
export function checkWin(state) {
  for (const [playerId, hand] of Object.entries(state.hands)) {
    if (hand.length === 0) return playerId;
  }
  return null;
}

// Returns the playerId after state.currentTurn, respecting turnDirection.
// applyCard already resolves skip/draw effects, so this is a plain next-in-sequence lookup.
export function getNextPlayer(state) {
  const { players, currentTurn, turnDirection } = state;
  const idx = players.indexOf(currentTurn);
  return players[((idx + turnDirection) % players.length + players.length) % players.length];
}

// Returns the best move for an AI player: { card, chosenColor } or null (must draw).
// chosenColor is non-null only for Wild / Wild Draw 4.
export function getAIMove(state, playerId) {
  const hand    = state.hands[playerId];
  const topCard = state.discardPile[state.discardPile.length - 1];
  const { activeColor, players, hands } = state;

  const hasColorMatch = hand.some(c => c.color === activeColor);
  const legal = hand.filter(c => isPlayable(c, topCard, activeColor, hasColorMatch));

  if (legal.length === 0) return null;

  const minOpponentCards = Math.min(
    ...players.filter(p => p !== playerId).map(p => hands[p].length)
  );

  // Color the AI holds the most of — used when playing a Wild
  const bestColor = () => {
    const counts = {};
    for (const c of hand) {
      if (c.color) counts[c.color] = (counts[c.color] || 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) return COLORS[Math.floor(Math.random() * COLORS.length)];
    return entries.reduce((best, cur) => cur[1] > best[1] ? cur : best)[0];
  };

  // 1. Wild Draw 4 when an opponent is near winning (≤ 2 cards)
  if (minOpponentCards <= 2) {
    const wd4 = legal.find(c => c.type === 'wild_draw4');
    if (wd4) return { card: wd4, chosenColor: bestColor() };
  }

  // 2. Draw 2 when an opponent is close (≤ 3 cards)
  if (minOpponentCards <= 3) {
    const d2 = legal.find(c => c.type === 'draw2');
    if (d2) return { card: d2, chosenColor: null };
  }

  // 3. Skip or Reverse when an opponent is close (≤ 3 cards)
  if (minOpponentCards <= 3) {
    const action = legal.find(c => c.type === 'skip' || c.type === 'reverse');
    if (action) return { card: action, chosenColor: null };
  }

  // 4. Number card matching active color (prefer color over number match)
  const colorNum = legal.find(c => c.type === 'number' && c.color === activeColor);
  if (colorNum) return { card: colorNum, chosenColor: null };

  // 5. Wild (not Draw 4 — save that for strategic moments)
  const wild = legal.find(c => c.type === 'wild');
  if (wild) return { card: wild, chosenColor: bestColor() };

  // 6. Any remaining legal card
  const fallback = legal[0];
  return {
    card: fallback,
    chosenColor: (fallback.type === 'wild' || fallback.type === 'wild_draw4') ? bestColor() : null,
  };
}

// game/lastCard.js — Pure Last Card (Uno-style) game logic, no React or UI.
//
// Internal state shape used by the screen:
// {
//   drawPile: Card[],
//   discardPile: Card[],
//   hands: { [playerId]: Card[] },
//   players: { id: string, name: string, isAI?: boolean }[],
//   currentTurn: string,
//   turnDirection: 1 | -1,
//   activeColor: string,
//   pendingDraw: number,
//   pendingAction: 'draw2' | 'draw4' | null,
//   awaitingColorChoiceBy: string | null,
//   pendingWildCard: Card | null,
// }
//
// Public state is created in LastCardGameScreen.js via toPublic().

export const COLORS = ["od_green", "crimson", "turquoise", "coral"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDeck() {
  const cards = [];
  let id = 0;

  for (const color of COLORS) {
    cards.push({ id: id++, color, type: "number", value: 0 });
    for (let v = 1; v <= 9; v++) {
      cards.push({ id: id++, color, type: "number", value: v });
      cards.push({ id: id++, color, type: "number", value: v });
    }
    for (let i = 0; i < 2; i++) {
      cards.push({ id: id++, color, type: "skip", value: null });
      cards.push({ id: id++, color, type: "reverse", value: null });
      cards.push({ id: id++, color, type: "draw2", value: null });
    }
  }

  for (let i = 0; i < 4; i++) {
    cards.push({ id: id++, color: null, type: "wild", value: null });
    cards.push({ id: id++, color: null, type: "wild_draw4", value: null });
  }

  return shuffle(cards);
}

export function dealHands(deck, playerCount, handSize = 7) {
  const deckCopy = [...deck];
  const hands = {};

  for (let i = 0; i < playerCount; i++) {
    hands[String(i)] = deckCopy.splice(0, handSize);
  }

  return { hands, remainingDeck: deckCopy };
}

export function isPlayable(card, topCard, activeColor, hasColorMatch = false) {
  if (!card || !topCard) return false;
  if (card.type === "wild") return true;
  if (card.type === "wild_draw4") return !hasColorMatch;

  if (card.color === activeColor) return true;
  if (card.type !== "number" && card.type === topCard.type) return true;
  if (
    card.type === "number" &&
    topCard.type === "number" &&
    card.value === topCard.value
  ) {
    return true;
  }

  return false;
}

function nextPlayerId(players, currentTurn, turnDirection, steps = 1) {
  const index = players.findIndex((p) => String(p.id) === String(currentTurn));
  if (index < 0 || players.length === 0) return currentTurn;
  const nextIndex =
    (((index + steps * turnDirection) % players.length) + players.length) %
    players.length;
  return String(players[nextIndex].id);
}

function resolvePlay(state, playerId, card, chosenColor) {
  const players = state.players ?? [];
  const turnDirection = state.turnDirection ?? 1;
  const next1 = nextPlayerId(players, playerId, turnDirection, 1);

  let nextTurn = next1;
  let nextDirection = turnDirection;
  let pendingDraw = 0;
  let pendingAction = null;
  let skippedPlayer = null;

  switch (card.type) {
    case "number":
    case "wild":
      nextTurn = next1;
      break;

    case "skip":
      skippedPlayer = next1;
      nextTurn = nextPlayerId(players, playerId, turnDirection, 2);
      break;

    case "reverse":
      nextDirection = -turnDirection;
      if (players.length === 2) {
        skippedPlayer = next1;
        nextTurn = String(playerId);
      } else {
        nextTurn = nextPlayerId(players, playerId, nextDirection, 1);
      }
      break;

    case "draw2":
      nextTurn = next1;
      pendingDraw = 2;
      pendingAction = "draw2";
      break;

    case "wild_draw4":
      nextTurn = next1;
      pendingDraw = 4;
      pendingAction = "draw4";
      break;

    default:
      nextTurn = next1;
  }

  return {
    ...state,
    activeColor:
      card.type === "wild" || card.type === "wild_draw4"
        ? chosenColor
        : card.color,
    currentTurn: nextTurn,
    turnDirection: nextDirection,
    pendingDraw,
    pendingAction,
    skippedPlayer,
    awaitingColorChoiceBy: null,
    pendingWildCard: null,
  };
}

export function applyCard(state, playerId, card, chosenColor = null) {
  const hand = state.hands[String(playerId)] ?? [];
  const cardIndex = hand.findIndex((c) => c.id === card.id);
  if (cardIndex < 0) return state;

  const topCard = state.discardPile[state.discardPile.length - 1];
  const hasColorMatch = hand.some((c) => c.color === state.activeColor);
  if (!isPlayable(card, topCard, state.activeColor, hasColorMatch))
    return state;

  const newHand = hand.filter((c) => c.id !== card.id);
  const newDiscardPile = [...state.discardPile, card];
  const nextState = {
    ...state,
    hands: { ...state.hands, [String(playerId)]: newHand },
    discardPile: newDiscardPile,
  };

  if ((card.type === "wild" || card.type === "wild_draw4") && !chosenColor) {
    return {
      ...nextState,
      activeColor: state.activeColor,
      currentTurn: String(playerId),
      awaitingColorChoiceBy: String(playerId),
      pendingWildCard: card,
    };
  }

  return resolvePlay(
    {
      ...nextState,
      activeColor:
        card.type === "wild" || card.type === "wild_draw4"
          ? chosenColor
          : card.color,
    },
    String(playerId),
    card,
    chosenColor ?? card.color,
  );
}

export function chooseColor(state, playerId, color) {
  if (String(state.awaitingColorChoiceBy) !== String(playerId)) return state;
  const card = state.pendingWildCard;
  if (!card) return state;

  const players = state.players ?? [];
  const turnDirection = state.turnDirection ?? 1;
  const nextTurn = nextPlayerId(players, playerId, turnDirection, 1);

  return {
    ...state,
    activeColor: color,
    currentTurn: nextTurn,
    pendingDraw: card.type === "wild_draw4" ? 4 : 0,
    pendingAction: card.type === "wild_draw4" ? "draw4" : null,
    skippedPlayer: null,
    awaitingColorChoiceBy: null,
    pendingWildCard: null,
  };
}

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
        [String(playerId)]: [...(s.hands[String(playerId)] ?? []), drawnCard],
      },
    },
    drawnCard,
  };
}

export function drawUntilPlayable(state, playerId) {
  let s = state;
  let drawnCard = null;

  while (true) {
    const result = drawCard(s, playerId);
    s = result.state;

    if (!result.drawnCard) {
      return { state: s, drawnCard: null, playableCard: null };
    }

    drawnCard = result.drawnCard;
    const topCard = s.discardPile[s.discardPile.length - 1];
    const hand = s.hands[String(playerId)] ?? [];
    const hasColorMatch = hand.some((c) => c.color === s.activeColor);

    if (isPlayable(drawnCard, topCard, s.activeColor, hasColorMatch)) {
      return { state: s, drawnCard, playableCard: drawnCard };
    }
  }
}

export function reshuffleDeck(state) {
  if (state.discardPile.length <= 1) return state;

  const topCard = state.discardPile[state.discardPile.length - 1];
  const toReshuffle = state.discardPile.slice(0, -1);

  return {
    ...state,
    drawPile: shuffle([...state.drawPile, ...toReshuffle]),
    discardPile: [topCard],
  };
}

export function checkWin(state) {
  for (const [playerId, hand] of Object.entries(state.hands)) {
    if ((hand ?? []).length === 0) return String(playerId);
  }
  return null;
}

export function getNextPlayer(state) {
  return nextPlayerId(
    state.players ?? [],
    state.currentTurn,
    state.turnDirection ?? 1,
    1,
  );
}

export function getAIMove(state, playerId) {
  const hand = state.hands[String(playerId)] ?? [];
  const topCard = state.discardPile[state.discardPile.length - 1];
  const { activeColor, players, hands } = state;

  const hasColorMatch = hand.some((c) => c.color === activeColor);
  const legal = hand.filter((c) =>
    isPlayable(c, topCard, activeColor, hasColorMatch),
  );

  if (legal.length === 0) return null;

  const minOpponentCards = Math.min(
    ...players
      .filter((p) => String(p.id) !== String(playerId))
      .map((p) => (hands[String(p.id)] ?? []).length),
  );

  const bestColor = () => {
    const counts = {};
    for (const c of hand) {
      if (c.color) counts[c.color] = (counts[c.color] || 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    return entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
  };

  if (minOpponentCards <= 2) {
    const wd4 = legal.find((c) => c.type === "wild_draw4");
    if (wd4) return { card: wd4, chosenColor: bestColor() };
  }

  if (minOpponentCards <= 3) {
    const d2 = legal.find((c) => c.type === "draw2");
    if (d2) return { card: d2, chosenColor: null };
  }

  if (minOpponentCards <= 3) {
    const action = legal.find((c) => c.type === "skip" || c.type === "reverse");
    if (action) return { card: action, chosenColor: null };
  }

  const colorNum = legal.find(
    (c) => c.type === "number" && c.color === activeColor,
  );
  if (colorNum) return { card: colorNum, chosenColor: null };

  const wild = legal.find((c) => c.type === "wild");
  if (wild) return { card: wild, chosenColor: bestColor() };

  const fallback = legal[0];
  return {
    card: fallback,
    chosenColor:
      fallback.type === "wild" || fallback.type === "wild_draw4"
        ? bestColor()
        : null,
  };
}

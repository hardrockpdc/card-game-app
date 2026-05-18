import { createDeck, shuffleDeck } from "./deck";

export const RUMMY_VARIANTS = {
  ginRummy: {
    id: "ginRummy",
    label: "Gin Rummy",
    deckCount: 1,
    includeJokers: false,
    handSize: 10,
    drawCount: 1,
    minMeldSize: 3,
    knockLimit: 10,
    scoreToWin: 100,
    ginBonus: 20,
    allowLayoff: true,
  },
  rummy500: {
    id: "rummy500",
    label: "Rummy 500",
    deckCount: 1,
    includeJokers: false,
    handSize: 7,
    drawCount: 1,
    minMeldSize: 3,
    knockLimit: 20,
    scoreToWin: 500,
    ginBonus: 10,
    allowLayoff: true,
  },
  indianRummy: {
    id: "indianRummy",
    label: "Indian Rummy",
    deckCount: 2,
    includeJokers: true,
    handSize: 13,
    drawCount: 1,
    minMeldSize: 3,
    knockLimit: 0,
    scoreToWin: 100,
    ginBonus: 50,
    allowLayoff: true,
    requiresTwoRuns: true,
    requiresPureRun: true,
  },
  canasta: {
    id: "canasta",
    label: "Canasta",
    deckCount: 2,
    includeJokers: true,
    handSize: 15,
    drawCount: 2,
    minMeldSize: 3,
    knockLimit: 0,
    scoreToWin: 5000,
    ginBonus: 100,
    allowLayoff: true,
    requireCanasta: true,
    canastaSize: 7,
  },
};

export const RUMMY_VARIANT_OPTIONS = [
  {
    value: "ginRummy",
    label: "Gin Rummy",
    description: "Classic 2-player rummy with a simple knock limit.",
  },
  {
    value: "rummy500",
    label: "Rummy 500",
    description: "Shorter hands and faster scoring for quick rounds.",
  },
  {
    value: "indianRummy",
    label: "Indian Rummy",
    description: "13-card rummy with two runs and one pure run.",
  },
  {
    value: "canasta",
    label: "Canasta",
    description: "Two decks, jokers, and big seven-card canastas.",
  },
];

const RUMMY_VARIANT_PLAYER_LIMITS = {
  ginRummy: { minPlayers: 2, maxPlayers: 2 },
  rummy500: { minPlayers: 2, maxPlayers: 4 },
  indianRummy: { minPlayers: 2, maxPlayers: 4 },
  canasta: { minPlayers: 2, maxPlayers: 4 },
};

export function getRummyVariantPlayerLimits(variantId = "ginRummy") {
  return (
    RUMMY_VARIANT_PLAYER_LIMITS[variantId] ||
    RUMMY_VARIANT_PLAYER_LIMITS.ginRummy
  );
}

export function getRummyVariantConfig(variantId = "ginRummy") {
  return RUMMY_VARIANTS[variantId] || RUMMY_VARIANTS.ginRummy;
}

export function getRummyVariantOptions() {
  return RUMMY_VARIANT_OPTIONS.map((variant) => ({
    label: variant.label,
    value: variant.value,
  }));
}

export function getRummyVariantLabel(variantId = "ginRummy") {
  return getRummyVariantConfig(variantId).label;
}

function drawCards(deck, count = 1) {
  const drawn = deck.slice(0, Math.max(0, count));
  return {
    cards: drawn,
    deck: deck.slice(drawn.length),
  };
}

function getRankLabel(rank) {
  if (rank === "JOKER") {
    return "JOKER";
  }
  return String(rank ?? "");
}

function getSuitSymbol(suit) {
  if (!suit || suit === "JOKER") {
    return "🃏";
  }
  return String(suit);
}

function formatCardLabel(card) {
  if (!card) {
    return "";
  }
  if (card.rank === "JOKER") {
    return "Joker";
  }
  return `${getRankLabel(card.rank)}${getSuitSymbol(card.suit)}`;
}

function toPlayerName(player, index) {
  if (typeof player === "string") {
    return player || `Player ${index + 1}`;
  }
  if (player && typeof player === "object") {
    return player.name || `Player ${index + 1}`;
  }
  return `Player ${index + 1}`;
}

function createEmptyRummyPlayer(player, index) {
  return {
    id: String(player?.id ?? `player-${index}`),
    name: toPlayerName(player, index),
    isAI: Boolean(player?.isAI),
    score: 0,
    knocked: false,
    finished: false,
  };
}

function isJokerCard(card) {
  return Boolean(card && card.rank === "JOKER");
}

function getSequenceValue(rank) {
  const values = {
    A: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    J: 11,
    Q: 12,
    K: 13,
  };

  return values[rank] || 0;
}

function getDeadwoodValue(card) {
  if (!card || isJokerCard(card)) {
    return 0;
  }

  const value = getSequenceValue(card.rank);
  return value > 10 ? 10 : value;
}

export function getCardDisplayLabel(card) {
  if (!card) {
    return "";
  }

  if (isJokerCard(card)) {
    return "Joker";
  }

  return `${getRankLabel(card.rank)}${getSuitSymbol(card.suit)}`;
}

function sortRummyCards(cards) {
  return (cards || []).slice().sort((left, right) => {
    const leftValue = getSequenceValue(left?.rank);
    const rightValue = getSequenceValue(right?.rank);
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
    const leftSuit = left?.suit || "";
    const rightSuit = right?.suit || "";
    return leftSuit.localeCompare(rightSuit);
  });
}

function buildRummyDeck(config) {
  let deck = [];

  for (let index = 0; index < (config.deckCount || 1); index += 1) {
    const deckInstanceIndex = index + 1;

    // Ensure React keys are unique even when a variant uses multiple decks.
    // (createDeck() card ids are rank+suit, which collide across deck instances)
    const deckInstance = createDeck().map((card) => ({
      ...card,
      id: `${card.id}-d${deckInstanceIndex}`,
    }));

    deck = deck.concat(deckInstance);

    if (config.includeJokers) {
      deck = deck.concat([
        { rank: "JOKER", suit: "JOKER", id: `JOKER-${index * 2 + 1}` },
        { rank: "JOKER", suit: "JOKER", id: `JOKER-${index * 2 + 2}` },
      ]);
    }
  }

  return shuffleDeck(deck);
}

function dealHands(deck, playerCount, handSize) {
  let workingDeck = deck.slice();
  const hands = [];

  for (let index = 0; index < playerCount; index += 1) {
    const drawn = drawCards(workingDeck, handSize);
    hands.push(drawn.cards);
    workingDeck = drawn.deck;
  }

  return {
    hands,
    deck: workingDeck,
  };
}

function drawInitialDiscard(deck) {
  const workingDeck = deck.slice();
  let attempts = 0;

  while (workingDeck.length && attempts < workingDeck.length) {
    const candidate = workingDeck.shift();
    if (!isJokerCard(candidate)) {
      return {
        deck: workingDeck,
        discardPile: [candidate],
      };
    }
    workingDeck.push(candidate);
    attempts += 1;
  }

  const fallback = workingDeck.shift();

  return {
    deck: workingDeck,
    discardPile: fallback ? [fallback] : [],
  };
}

function cloneMeld(meld) {
  if (!meld) {
    return meld;
  }

  if (Array.isArray(meld)) {
    return meld.map((card) =>
      card && typeof card === "object" ? { ...card } : card,
    );
  }

  if (meld.rank && meld.suit && !meld.cards && !meld.owner && !meld.type) {
    return { ...meld };
  }

  return {
    ...meld,
    cards: Array.isArray(meld.cards) ? meld.cards.slice() : [],
  };
}

function cloneMeldCollection(melds) {
  if (!Array.isArray(melds)) {
    return [];
  }

  return melds.map((item) => {
    if (Array.isArray(item)) {
      return item.map((meld) => cloneMeld(meld));
    }
    return cloneMeld(item);
  });
}

function cloneRummyState(state) {
  return {
    ...state,
    players: (state.players || []).map((player) => ({ ...player })),
    hands: (state.hands || []).map((hand) => hand.slice()),
    melds: cloneMeldCollection(state.melds),
    deck: (state.deck || []).slice(),
    stock: (state.stock || state.deck || []).slice(),
    discardPile: (state.discardPile || []).slice(),
    scores: (state.scores || []).slice(),
  };
}

function getMeldCards(meld) {
  if (!meld) {
    return [];
  }

  if (Array.isArray(meld)) {
    return meld.slice();
  }

  if (Array.isArray(meld.cards)) {
    return meld.cards.slice();
  }

  return [];
}

function getPlayerMelds(melds, pid) {
  if (!Array.isArray(melds)) {
    return [];
  }

  if (melds.length > 0 && Array.isArray(melds[0])) {
    return melds[pid] || [];
  }

  return melds.filter(
    (meld) => meld && (meld.owner === pid || meld.pid === pid),
  );
}

function flattenMeldCards(melds) {
  const cards = [];

  if (!Array.isArray(melds)) {
    return cards;
  }

  if (melds.length > 0 && Array.isArray(melds[0])) {
    melds.forEach((playerMelds) => {
      (playerMelds || []).forEach((meld) => {
        cards.push(...getMeldCards(meld));
      });
    });
    return cards;
  }

  melds.forEach((meld) => {
    cards.push(...getMeldCards(meld));
  });

  return cards;
}

function sameCard(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  return left.rank === right.rank && left.suit === right.suit;
}

function isValidRummySet(cards) {
  if (!Array.isArray(cards) || cards.length < 3) {
    return false;
  }

  const nonJokers = cards.filter((card) => !isJokerCard(card));

  if (!nonJokers.length) {
    return true;
  }

  const rank = nonJokers[0].rank;
  return nonJokers.every((card) => card.rank === rank);
}

function isValidRummyRun(cards) {
  if (!Array.isArray(cards) || cards.length < 3) {
    return false;
  }

  const nonJokers = cards.filter((card) => !isJokerCard(card));

  if (!nonJokers.length) {
    return false;
  }

  const suit = nonJokers[0].suit;
  if (!nonJokers.every((card) => card.suit === suit)) {
    return false;
  }

  const values = nonJokers
    .map((card) => getSequenceValue(card.rank))
    .sort((left, right) => left - right);
  if (values.some((value) => !value)) {
    return false;
  }

  const uniqueValues = new Set(values);
  if (uniqueValues.size !== values.length) {
    return false;
  }

  const totalCards = cards.length;
  for (let start = 1; start <= 13 - totalCards + 1; start += 1) {
    const target = new Set();
    for (let value = start; value < start + totalCards; value += 1) {
      target.add(value);
    }

    if (values.every((value) => target.has(value))) {
      return true;
    }
  }

  return false;
}

function getRummyMeldType(cards) {
  if (isValidRummySet(cards)) {
    return "set";
  }

  if (isValidRummyRun(cards)) {
    return "run";
  }

  return null;
}

export function isValidRummyMeld(cards) {
  return getRummyMeldType(cards) != null;
}

export function canExtendRummyMeld(meld, card) {
  const cards = getMeldCards(meld);
  if (!cards.length || !card) {
    return false;
  }

  return isValidRummyMeld(cards.concat(card));
}

function isPureRun(cards) {
  return (
    isValidRummyRun(cards) && !(cards || []).some((card) => isJokerCard(card))
  );
}

export function calculateRummyDeadwood(hand, melds) {
  if (!Array.isArray(hand) || !hand.length) {
    return 0;
  }

  const used = new Array(hand.length).fill(false);
  const meldCards = flattenMeldCards(melds);

  meldCards.forEach((meldCard) => {
    const exactIndex = hand.findIndex(
      (card, index) => !used[index] && card === meldCard,
    );
    if (exactIndex !== -1) {
      used[exactIndex] = true;
      return;
    }

    const matchIndex = hand.findIndex(
      (card, index) => !used[index] && sameCard(card, meldCard),
    );
    if (matchIndex !== -1) {
      used[matchIndex] = true;
    }
  });

  let total = 0;
  hand.forEach((card, index) => {
    if (!used[index]) {
      total += getDeadwoodValue(card);
    }
  });

  return total;
}

function calculateRummyMeldPoints(melds) {
  return flattenMeldCards(melds).reduce(
    (total, card) => total + getDeadwoodValue(card),
    0,
  );
}

function analyzeRummyMelds(melds) {
  const meldList = Array.isArray(melds) ? melds : [];
  let runCount = 0;
  let setCount = 0;
  let pureRunCount = 0;
  let canastaCount = 0;

  meldList.forEach((meld) => {
    const cards = getMeldCards(meld);
    const type = getRummyMeldType(cards);

    if (type === "run") {
      runCount += 1;
      if (isPureRun(cards)) {
        pureRunCount += 1;
      }
    } else if (type === "set") {
      setCount += 1;
    }

    if (cards.length >= 7) {
      canastaCount += 1;
    }
  });

  return {
    runCount,
    setCount,
    pureRunCount,
    canastaCount,
    meldCount: meldList.length,
  };
}

function canPlayerFinish(state, pid, config) {
  const hand = state.hands[pid] || [];
  const playerMelds = getPlayerMelds(state.melds, pid);
  const deadwood = calculateRummyDeadwood(hand, playerMelds);
  const analysis = analyzeRummyMelds(playerMelds);

  if (config.id === "straightGin") {
    return deadwood === 0;
  }

  if (config.id === "indianRummy") {
    return (
      deadwood === 0 && analysis.runCount >= 2 && analysis.pureRunCount >= 1
    );
  }

  if (config.id === "canasta") {
    return deadwood === 0 && (analysis.canastaCount >= 1 || hand.length === 0);
  }

  return deadwood <= (config.knockLimit != null ? config.knockLimit : 10);
}

function calculateRummyRoundPoints(state, pid, config) {
  let total = 0;
  const players = state.players || [];

  players.forEach((player, index) => {
    if (index === pid) {
      return;
    }

    const opponentHand = state.hands[index] || [];
    const opponentMelds = getPlayerMelds(state.melds, index);
    total += calculateRummyDeadwood(opponentHand, opponentMelds);
  });

  const ownMelds = getPlayerMelds(state.melds, pid);
  const ownDeadwood = calculateRummyDeadwood(state.hands[pid] || [], ownMelds);
  const ownMeldPoints = calculateRummyMeldPoints(ownMelds);
  const bonus = ownDeadwood === 0 ? config.ginBonus || 0 : 0;

  return total + ownMeldPoints + bonus;
}

function updatePlayerScore(nextState, pid, points) {
  if (!nextState.players[pid]) {
    return;
  }

  nextState.scores[pid] = (nextState.scores[pid] || 0) + points;
  nextState.players[pid].score = nextState.scores[pid];
  nextState.players[pid].knocked = true;
  nextState.players[pid].finished = true;
}

function finalizeRummyWin(nextState, pid, config, reason) {
  const playerName = nextState.players[pid]?.name || "Player";
  const playerMelds = getPlayerMelds(nextState.melds, pid);
  const deadwood = calculateRummyDeadwood(
    nextState.hands[pid] || [],
    playerMelds,
  );
  const points = calculateRummyRoundPoints(nextState, pid, config);

  updatePlayerScore(nextState, pid, points);
  nextState.winner = pid;
  nextState.phase = "game-over";

  if (reason === "knock") {
    nextState.statusMessage = `${playerName} knocks and wins with ${deadwood} deadwood.`;
    return nextState;
  }

  if (config.id === "straightGin") {
    nextState.statusMessage = `${playerName} wins with gin!`;
    return nextState;
  }

  if (config.id === "indianRummy") {
    nextState.statusMessage = `${playerName} wins with a valid Indian Rummy hand!`;
    return nextState;
  }

  if (config.id === "canasta") {
    nextState.statusMessage = `${playerName} goes out with canasta!`;
    return nextState;
  }

  nextState.statusMessage = `${playerName} wins with ${deadwood} deadwood.`;
  return nextState;
}

function ensureStock(nextState) {
  let stock = nextState.deck || nextState.stock || [];

  if (stock.length > 0) {
    nextState.deck = stock.slice();
    nextState.stock = stock.slice();
    return;
  }

  if ((nextState.discardPile || []).length <= 1) {
    nextState.deck = [];
    nextState.stock = [];
    return;
  }

  const topCard = nextState.discardPile[nextState.discardPile.length - 1];
  const recycled = nextState.discardPile.slice(0, -1);
  stock = shuffleDeck((nextState.deck || []).concat(recycled));
  nextState.deck = stock.slice();
  nextState.stock = stock.slice();
  nextState.discardPile = [topCard];
}

function getSelectionIndexes(hand, action) {
  if (!action || !Array.isArray(hand)) {
    return [];
  }

  if (Array.isArray(action.cardIndexes)) {
    return Array.from(
      new Set(
        action.cardIndexes.filter(
          (index) => Number.isInteger(index) && hand[index],
        ),
      ),
    );
  }

  if (Array.isArray(action.cardIndices)) {
    return Array.from(
      new Set(
        action.cardIndices.filter(
          (index) => Number.isInteger(index) && hand[index],
        ),
      ),
    );
  }

  if (Array.isArray(action.cards)) {
    const used = new Array(hand.length).fill(false);
    const indexes = [];

    action.cards.forEach((card) => {
      let matchIndex = hand.findIndex(
        (handCard, index) => !used[index] && sameCard(handCard, card),
      );
      if (matchIndex === -1) {
        matchIndex = hand.findIndex(
          (handCard, index) => !used[index] && handCard === card,
        );
      }
      if (matchIndex !== -1) {
        used[matchIndex] = true;
        indexes.push(matchIndex);
      }
    });

    return indexes;
  }

  if (Number.isInteger(action.cardIndex) && hand[action.cardIndex]) {
    return [action.cardIndex];
  }

  if (action.card) {
    const index = hand.findIndex(
      (handCard) => sameCard(handCard, action.card) || handCard === action.card,
    );
    return index === -1 ? [] : [index];
  }

  return [];
}

function removeCardsFromHand(hand, indexes) {
  const nextHand = hand.slice();
  const removed = [];
  const sorted = indexes.slice().sort((left, right) => right - left);

  sorted.forEach((index) => {
    if (!nextHand[index]) {
      return;
    }
    const [card] = nextHand.splice(index, 1);
    removed.unshift(card);
  });

  return {
    hand: nextHand,
    cards: removed,
  };
}

function findBestMeldInHand(hand, difficulty = "normal") {
  if (!Array.isArray(hand) || hand.length < 3) {
    return null;
  }

  const maxSizeByDifficulty = {
    easy: 3,
    normal: 5,
    hard: 7,
  };

  const maxSize = Math.min(maxSizeByDifficulty[difficulty] || 5, hand.length);

  for (let size = maxSize; size >= 3; size -= 1) {
    const indexes = Array.from({ length: hand.length }, (_, index) => index);
    const combos = [];

    function buildCombos(start, current) {
      if (current.length === size) {
        combos.push(current.slice());
        return;
      }

      for (let index = start; index < indexes.length; index += 1) {
        current.push(indexes[index]);
        buildCombos(index + 1, current);
        current.pop();
      }
    }

    buildCombos(0, []);

    let best = null;
    combos.forEach((combo) => {
      const cards = combo.map((index) => hand[index]);
      if (!isValidRummyMeld(cards)) {
        return;
      }

      const score =
        cards.reduce((total, card) => total + getDeadwoodValue(card), 0) +
        cards.length * 5;
      if (!best || score > best.score) {
        best = {
          cardIndexes: combo,
          cards: sortRummyCards(cards),
          score,
        };
      }
    });

    if (best) {
      return best;
    }
  }

  return null;
}

function wouldCardCompleteMeld(hand, card) {
  if (!card || !Array.isArray(hand) || hand.length < 2) {
    return false;
  }

  for (let first = 0; first < hand.length - 1; first += 1) {
    for (let second = first + 1; second < hand.length; second += 1) {
      if (isValidRummyMeld([hand[first], hand[second], card])) {
        return true;
      }
    }
  }

  return false;
}

function findBestExtensionMove(hand, melds) {
  if (
    !Array.isArray(hand) ||
    !hand.length ||
    !Array.isArray(melds) ||
    !melds.length
  ) {
    return null;
  }

  let best = null;

  melds.forEach((meld, meldIndex) => {
    const cards = getMeldCards(meld);
    hand.forEach((card, cardIndex) => {
      if (!canExtendRummyMeld(meld, card)) {
        return;
      }

      const score = cards.length * 10 + getDeadwoodValue(card);
      if (!best || score > best.score) {
        best = {
          type: "extend-meld",
          meldIndex,
          cardIndex,
          score,
        };
      }
    });
  });

  return best;
}

function chooseDiscardCardIndex(hand) {
  if (!Array.isArray(hand) || !hand.length) {
    return 0;
  }

  const protectedIndexes = new Set();

  for (let index = 0; index < hand.length; index += 1) {
    for (let first = 0; first < hand.length - 1; first += 1) {
      if (first === index) {
        continue;
      }
      for (let second = first + 1; second < hand.length; second += 1) {
        if (second === index) {
          continue;
        }
        if (isValidRummyMeld([hand[index], hand[first], hand[second]])) {
          protectedIndexes.add(index);
        }
      }
    }
  }

  let chosenIndex = 0;
  let highestValue = -1;

  hand.forEach((card, index) => {
    if (protectedIndexes.has(index)) {
      return;
    }

    const value = getDeadwoodValue(card);
    if (value >= highestValue) {
      highestValue = value;
      chosenIndex = index;
    }
  });

  if (highestValue >= 0) {
    return chosenIndex;
  }

  hand.forEach((card, index) => {
    const value = getDeadwoodValue(card);
    if (value >= highestValue) {
      highestValue = value;
      chosenIndex = index;
    }
  });

  return chosenIndex;
}

export function createRummyState({
  variantId = "ginRummy",
  players = [],
  difficulty = "normal",
} = {}) {
  const config = getRummyVariantConfig(variantId);
  const deck = buildRummyDeck(config);
  const normalizedPlayers = (
    players.length > 0 ? players : [{ name: "Player 1" }, { name: "Player 2" }]
  ).map((player, index) => ({
    id: String(player?.id ?? `player-${index}`),
    name: toPlayerName(player, index),
    isAI: Boolean(player?.isAI),
  }));
  const dealt = dealHands(deck, normalizedPlayers.length, config.handSize);
  const discardSetup = drawInitialDiscard(dealt.deck);

  return {
    gameType: "rummy",
    variantId: config.id,
    variantLabel: config.label,
    difficulty,
    phase: "draw",
    currentPlayerIndex: 0,
    dealerIndex: 0,
    roundNumber: 1,
    players: normalizedPlayers.map((player, index) =>
      createEmptyRummyPlayer(player, index),
    ),
    hands: dealt.hands,
    melds: [],
    deck: discardSetup.deck.slice(),
    stock: discardSetup.deck.slice(),
    discardPile: discardSetup.discardPile,
    scores: normalizedPlayers.map(() => 0),
    winner: null,
    tie: false,
    statusMessage: "Draw a card, make melds, and discard to end your turn.",
    handSize: config.handSize,
    drawCount: config.drawCount,
    minMeldSize: config.minMeldSize,
    knockLimit: config.knockLimit,
    scoreToWin: config.scoreToWin,
    deckCount: config.deckCount,
    includeJokers: config.includeJokers,
    allowLayoff: config.allowLayoff !== false,
    requiresTwoRuns: Boolean(config.requiresTwoRuns),
    requiresPureRun: Boolean(config.requiresPureRun),
    requireCanasta: Boolean(config.requireCanasta),
    canastaSize: config.canastaSize || 7,
  };
}

export function rummyAiChooseMove(state, pid, difficulty = "normal") {
  if (!state || !Array.isArray(state.hands)) {
    return { type: "draw-card" };
  }

  const hand = state.hands[pid] || [];
  const phase = state.phase || "draw";
  const config = getRummyVariantConfig(state.variantId);
  const topDiscard = (state.discardPile || [])[state.discardPile.length - 1];

  if (phase === "draw") {
    if (topDiscard && wouldCardCompleteMeld(hand, topDiscard)) {
      return { type: "draw-card", from: "discard" };
    }

    return { type: "draw-card", from: "stock" };
  }

  if (phase === "discard") {
    const bestMeld = findBestMeldInHand(hand, difficulty);
    if (bestMeld) {
      return { type: "lay-meld", cardIndexes: bestMeld.cardIndexes };
    }

    const extension = findBestExtensionMove(hand, state.melds || []);
    if (extension) {
      return extension;
    }

    const discardIndex = chooseDiscardCardIndex(hand, config);
    return { type: "discard-card", cardIndex: discardIndex };
  }

  return { type: "draw-card" };
}

function normalizeActionType(type) {
  if (type === "draw") {
    return "draw-card";
  }
  if (type === "discard") {
    return "discard-card";
  }
  if (type === "meld-cards") {
    return "lay-meld";
  }
  if (type === "go-gin" || type === "go-out") {
    return "knock";
  }
  return type;
}

export function rummyReducer(state, action = {}) {
  if (
    !state ||
    typeof state !== "object" ||
    state.winner != null ||
    state.tie
  ) {
    return state;
  }

  const nextState = cloneRummyState(state);
  const config = getRummyVariantConfig(nextState.variantId);
  const type = normalizeActionType(action.type);
  const playerCount = nextState.players.length;

  if (!playerCount) {
    return nextState;
  }

  const pid = nextState.currentPlayerIndex || 0;
  if (Number.isInteger(action.pid) && action.pid !== pid) {
    return nextState;
  }

  const hand = nextState.hands[pid] || [];
  const playerName = nextState.players[pid]?.name || "Player";

  if (type === "draw-card") {
    if (nextState.phase !== "draw") {
      return nextState;
    }

    const fromDiscard = action.from === "discard";
    let drawnCards = [];

    if (fromDiscard) {
      if ((nextState.discardPile || []).length) {
        drawnCards = [nextState.discardPile.pop()];
      } else {
        ensureStock(nextState);
        const drawn = drawCards(nextState.stock || nextState.deck || [], 1);
        drawnCards = drawn.cards;
        nextState.deck = drawn.deck.slice();
        nextState.stock = drawn.deck.slice();
      }
    } else {
      ensureStock(nextState);
      const drawCount = Math.max(1, action.count || config.drawCount || 1);
      const drawn = drawCards(
        nextState.deck || nextState.stock || [],
        drawCount,
      );
      drawnCards = drawn.cards;
      nextState.deck = drawn.deck.slice();
      nextState.stock = drawn.deck.slice();
    }

    if (!drawnCards.length) {
      nextState.tie = true;
      nextState.statusMessage = "The deck and discard pile ran out.";
      return nextState;
    }

    hand.push(...drawnCards);
    nextState.phase = "discard";
    nextState.statusMessage = fromDiscard
      ? `${playerName} drew from the discard pile.`
      : `${playerName} drew ${drawnCards.length} card(s).`;

    return nextState;
  }

  if (type === "lay-meld") {
    if (nextState.phase !== "discard") {
      return nextState;
    }

    const indexes = getSelectionIndexes(hand, action);
    if (indexes.length < (config.minMeldSize || 3)) {
      return nextState;
    }

    const selected = removeCardsFromHand(hand, indexes);
    if (!isValidRummyMeld(selected.cards)) {
      return nextState;
    }

    nextState.hands[pid] = selected.hand;
    nextState.melds.push({
      owner: pid,
      type: getRummyMeldType(selected.cards),
      cards: sortRummyCards(selected.cards),
    });
    nextState.statusMessage = `${playerName} laid down a meld.`;

    if (
      !nextState.hands[pid].length &&
      canPlayerFinish(nextState, pid, config)
    ) {
      return finalizeRummyWin(nextState, pid, config, "meld");
    }

    return nextState;
  }

  if (type === "extend-meld") {
    if (nextState.phase !== "discard") {
      return nextState;
    }

    const cardIndexes = getSelectionIndexes(hand, action);
    const cardIndex = cardIndexes[0];
    const meldIndex = Number.isInteger(action.meldIndex)
      ? action.meldIndex
      : -1;
    const targetMeld = nextState.melds[meldIndex];

    if (
      !targetMeld ||
      !hand[cardIndex] ||
      !canExtendRummyMeld(targetMeld, hand[cardIndex])
    ) {
      return nextState;
    }

    const [card] = hand.splice(cardIndex, 1);
    targetMeld.cards = sortRummyCards((targetMeld.cards || []).concat(card));
    nextState.statusMessage = `${playerName} added to a meld.`;

    if (!hand.length && canPlayerFinish(nextState, pid, config)) {
      return finalizeRummyWin(nextState, pid, config, "meld");
    }

    return nextState;
  }

  if (type === "knock") {
    if (nextState.phase !== "discard") {
      return nextState;
    }

    if (!canPlayerFinish(nextState, pid, config)) {
      nextState.statusMessage = `${playerName} cannot finish yet.`;
      return nextState;
    }

    return finalizeRummyWin(nextState, pid, config, "knock");
  }

  if (type === "discard-card") {
    if (nextState.phase !== "discard") {
      return nextState;
    }

    const indexes = getSelectionIndexes(hand, action);
    const discardIndex = indexes.length ? indexes[0] : -1;
    if (!hand[discardIndex]) {
      return nextState;
    }

    const [card] = hand.splice(discardIndex, 1);
    nextState.discardPile.push(card);

    if (canPlayerFinish(nextState, pid, config)) {
      return finalizeRummyWin(nextState, pid, config, "discard");
    }

    nextState.currentPlayerIndex = (pid + 1) % playerCount;
    nextState.phase = "draw";
    nextState.statusMessage = `${playerName} discarded ${formatCardLabel(card)}.`;

    return nextState;
  }

  return nextState;
}

export function getRummyScoreSummary(state, pid) {
  const hand = (state && state.hands && state.hands[pid]) || [];
  const playerMelds = getPlayerMelds(state && state.melds, pid);
  const config = getRummyVariantConfig(state && state.variantId);
  const deadwood = calculateRummyDeadwood(hand, playerMelds);
  const analysis = analyzeRummyMelds(playerMelds);
  const roundPoints = calculateRummyRoundPoints(
    state || { players: [], hands: [], melds: [] },
    pid,
    config,
  );

  return {
    handCount: hand.length,
    meldCount: analysis.meldCount,
    meldPoints: calculateRummyMeldPoints(playerMelds),
    deadwood,
    score: (state && state.scores && state.scores[pid]) || 0,
    roundPoints,
    canKnock: canPlayerFinish(
      state || { hands: [], melds: [], players: [] },
      pid,
      config,
    ),
  };
}

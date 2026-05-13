const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const SUIT_SYMBOLS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const RANKS = [
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 },
  { label: "A", value: 14 },
];

export const POKER_VARIANTS = {
  texasHoldem: {
    key: "texasHoldem",
    label: "Texas Hold'em",
    holeCardCount: 2,
    communityCardCount: 5,
    usesCommunityCards: true,
    usesDrawPhase: false,
    usesStudCards: false,
    communityRevealCounts: [0, 3, 4, 5],
  },
  omaha: {
    key: "omaha",
    label: "Omaha",
    holeCardCount: 4,
    communityCardCount: 5,
    usesCommunityCards: true,
    usesDrawPhase: false,
    usesStudCards: false,
    communityRevealCounts: [0, 3, 4, 5],
  },
  fiveCardDraw: {
    key: "fiveCardDraw",
    label: "Five Card Draw",
    holeCardCount: 5,
    communityCardCount: 0,
    usesCommunityCards: false,
    usesDrawPhase: true,
    usesStudCards: false,
    communityRevealCounts: [0],
  },
  sevenCardStud: {
    key: "sevenCardStud",
    label: "Seven Card Stud",
    holeCardCount: 7,
    communityCardCount: 0,
    usesCommunityCards: false,
    usesDrawPhase: false,
    usesStudCards: true,
    communityRevealCounts: [0],
  },
};

export function getPokerVariantConfig(variant) {
  return POKER_VARIANTS[variant] ?? POKER_VARIANTS.texasHoldem;
}

export function createStandardDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank.label}-${suit}`,
        rank: rank.label,
        value: rank.value,
        suit,
        color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
        symbol: `${rank.label}${SUIT_SYMBOLS[suit]}`,
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck = createStandardDeck()) {
  const cards = deck.slice();

  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cards[i];
    cards[i] = cards[j];
    cards[j] = temp;
  }

  return cards;
}

export function formatPokerCard(card) {
  if (!card) {
    return "";
  }

  if (card.symbol) {
    return card.symbol;
  }

  const rank = getCardValue(card);
  const suit = getCardSuit(card);
  const displayRank = getRankLabel(rank);
  const suitSymbol = SUIT_SYMBOLS[suit] ?? "";
  return `${displayRank}${suitSymbol}`;
}

export function getRankLabel(value) {
  const found = RANKS.find((rank) => rank.value === value);
  return found ? found.label : String(value ?? "");
}

export function getCardSuit(card) {
  if (!card) {
    return "";
  }

  const rawSuit =
    card.suit ??
    card.type ??
    card.cardSuit ??
    card.suitName ??
    card.metadata?.suit ??
    "";

  return String(rawSuit).toLowerCase();
}

export function getCardValue(card) {
  if (!card) {
    return 0;
  }

  if (typeof card.value === "number" && Number.isFinite(card.value)) {
    return card.value;
  }

  if (typeof card.rank === "number" && Number.isFinite(card.rank)) {
    return card.rank;
  }

  const candidates = [
    card.rank,
    card.value,
    card.label,
    card.face,
    card.name,
    card.code,
    card.id,
    card.symbol,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const raw = String(candidate)
      .toUpperCase()
      .replace(/[^0-9AJQKT]/g, "");
    if (!raw) {
      continue;
    }

    if (raw.startsWith("10")) {
      return 10;
    }

    if (raw.includes("A")) {
      return 14;
    }

    if (raw.includes("K")) {
      return 13;
    }

    if (raw.includes("Q")) {
      return 12;
    }

    if (raw.includes("J")) {
      return 11;
    }

    if (raw.includes("T")) {
      return 10;
    }

    const numeric = Number.parseInt(raw, 10);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return 0;
}

function sortCardsDescending(cards) {
  return cards.slice().sort((left, right) => {
    const valueDifference = getCardValue(right) - getCardValue(left);
    if (valueDifference !== 0) {
      return valueDifference;
    }

    return getCardSuit(left).localeCompare(getCardSuit(right));
  });
}

function getStraightHighFromCards(cards) {
  const values = [...new Set(cards.map((card) => getCardValue(card)))];

  if (values.length !== 5) {
    return null;
  }

  const valueSet = new Set(values);

  for (let high = 14; high >= 5; high -= 1) {
    let isStraight = true;

    for (let offset = 0; offset < 5; offset += 1) {
      if (!valueSet.has(high - offset)) {
        isStraight = false;
        break;
      }
    }

    if (isStraight) {
      return high;
    }
  }

  if (
    valueSet.has(14) &&
    valueSet.has(5) &&
    valueSet.has(4) &&
    valueSet.has(3) &&
    valueSet.has(2)
  ) {
    return 5;
  }

  return null;
}

function buildStraightCards(cards, straightHigh) {
  const sortedCards = sortCardsDescending(cards);
  const neededRanks =
    straightHigh === 5
      ? [5, 4, 3, 2, 14]
      : [
          straightHigh,
          straightHigh - 1,
          straightHigh - 2,
          straightHigh - 3,
          straightHigh - 4,
        ];

  const usedIndexes = new Set();
  const orderedCards = [];

  for (const neededRank of neededRanks) {
    const cardIndex = sortedCards.findIndex(
      (card, index) =>
        !usedIndexes.has(index) && getCardValue(card) === neededRank,
    );

    if (cardIndex !== -1) {
      usedIndexes.add(cardIndex);
      orderedCards.push(sortedCards[cardIndex]);
    }
  }

  return orderedCards;
}

function buildKickerCards(cards, excludedValues = [], count = 3) {
  const sortedCards = sortCardsDescending(cards);
  const kickers = [];

  for (const card of sortedCards) {
    if (excludedValues.includes(getCardValue(card))) {
      continue;
    }

    kickers.push(card);
    if (kickers.length === count) {
      break;
    }
  }

  return kickers;
}

function buildRepeatedValueCards(cards, value, count) {
  const sortedCards = sortCardsDescending(cards);
  const matched = [];

  for (const card of sortedCards) {
    if (getCardValue(card) === value) {
      matched.push(card);
    }

    if (matched.length === count) {
      break;
    }
  }

  return matched;
}

export function comparePokerScores(leftScore, rightScore) {
  if (!leftScore && !rightScore) {
    return 0;
  }

  if (!leftScore) {
    return -1;
  }

  if (!rightScore) {
    return 1;
  }

  const maxLength = Math.max(leftScore.length, rightScore.length);

  for (let index = 0; index < maxLength; index += 1) {
    const left = leftScore[index] ?? 0;
    const right = rightScore[index] ?? 0;

    if (left > right) {
      return 1;
    }

    if (left < right) {
      return -1;
    }
  }

  return 0;
}

export function evaluateFiveCardHand(cards) {
  if (!Array.isArray(cards) || cards.length !== 5) {
    return null;
  }

  const sortedCards = sortCardsDescending(cards);
  const values = sortedCards.map((card) => getCardValue(card));
  const suits = sortedCards.map((card) => getCardSuit(card));

  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const groupData = [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort(
      (left, right) => right.count - left.count || right.value - left.value,
    );

  const isFlush = suits.every((suit) => suit === suits[0]);
  const straightHigh = getStraightHighFromCards(sortedCards);
  const isStraight = straightHigh !== null;

  if (isFlush && isStraight) {
    return {
      category: 8,
      name: "Straight Flush",
      score: [8, straightHigh],
      cards: buildStraightCards(sortedCards, straightHigh),
    };
  }

  if (groupData[0]?.count === 4) {
    const quadValue = groupData[0].value;
    const kicker = buildKickerCards(sortedCards, [quadValue], 1)[0] ?? null;
    return {
      category: 7,
      name: "Four of a Kind",
      score: [7, quadValue, getCardValue(kicker)],
      cards: [
        ...buildRepeatedValueCards(sortedCards, quadValue, 4),
        kicker,
      ].filter(Boolean),
    };
  }

  if (groupData[0]?.count === 3 && groupData[1]?.count === 2) {
    const tripsValue = groupData[0].value;
    const pairValue = groupData[1].value;
    return {
      category: 6,
      name: "Full House",
      score: [6, tripsValue, pairValue],
      cards: [
        ...buildRepeatedValueCards(sortedCards, tripsValue, 3),
        ...buildRepeatedValueCards(sortedCards, pairValue, 2),
      ],
    };
  }

  if (isFlush) {
    return {
      category: 5,
      name: "Flush",
      score: [5, ...values],
      cards: sortedCards,
    };
  }

  if (isStraight) {
    return {
      category: 4,
      name: "Straight",
      score: [4, straightHigh],
      cards: buildStraightCards(sortedCards, straightHigh),
    };
  }

  if (groupData[0]?.count === 3) {
    const tripsValue = groupData[0].value;
    const kickers = buildKickerCards(sortedCards, [tripsValue], 2);
    return {
      category: 3,
      name: "Three of a Kind",
      score: [3, tripsValue, ...kickers.map((card) => getCardValue(card))],
      cards: [
        ...buildRepeatedValueCards(sortedCards, tripsValue, 3),
        ...kickers,
      ],
    };
  }

  if (groupData[0]?.count === 2 && groupData[1]?.count === 2) {
    const highPair = Math.max(groupData[0].value, groupData[1].value);
    const lowPair = Math.min(groupData[0].value, groupData[1].value);
    const kicker =
      buildKickerCards(sortedCards, [highPair, lowPair], 1)[0] ?? null;
    return {
      category: 2,
      name: "Two Pair",
      score: [2, highPair, lowPair, getCardValue(kicker)],
      cards: [
        ...buildRepeatedValueCards(sortedCards, highPair, 2),
        ...buildRepeatedValueCards(sortedCards, lowPair, 2),
        kicker,
      ].filter(Boolean),
    };
  }

  if (groupData[0]?.count === 2) {
    const pairValue = groupData[0].value;
    const kickers = buildKickerCards(sortedCards, [pairValue], 3);
    return {
      category: 1,
      name: "One Pair",
      score: [1, pairValue, ...kickers.map((card) => getCardValue(card))],
      cards: [
        ...buildRepeatedValueCards(sortedCards, pairValue, 2),
        ...kickers,
      ],
    };
  }

  return {
    category: 0,
    name: "High Card",
    score: [0, ...values],
    cards: sortedCards,
  };
}

export function combinationsOfSize(items, size) {
  const results = [];

  function walk(startIndex, current) {
    if (current.length === size) {
      results.push(current.slice());
      return;
    }

    for (let index = startIndex; index < items.length; index += 1) {
      current.push(items[index]);
      walk(index + 1, current);
      current.pop();
    }
  }

  if (size <= 0) {
    return [[]];
  }

  if (items.length < size) {
    return [];
  }

  walk(0, []);
  return results;
}

export function getBestFiveCardHand(cards) {
  if (!Array.isArray(cards) || cards.length < 5) {
    return null;
  }

  const allCombos = combinationsOfSize(cards, 5);
  let bestHand = null;

  for (const combo of allCombos) {
    const evaluated = evaluateFiveCardHand(combo);

    if (!bestHand || comparePokerScores(evaluated.score, bestHand.score) > 0) {
      bestHand = evaluated;
    }
  }

  return bestHand;
}

export function evaluatePokerVariantHand({
  variant = "texasHoldem",
  holeCards = [],
  communityCards = [],
}) {
  const config = getPokerVariantConfig(variant);

  if (config.key === "omaha") {
    if (holeCards.length < 4 || communityCards.length < 5) {
      return null;
    }

    const holeCombos = combinationsOfSize(holeCards, 2);
    const boardCombos = combinationsOfSize(communityCards, 3);
    let bestHand = null;

    for (const holeCombo of holeCombos) {
      for (const boardCombo of boardCombos) {
        const evaluated = evaluateFiveCardHand([...holeCombo, ...boardCombo]);

        if (
          !bestHand ||
          comparePokerScores(evaluated.score, bestHand.score) > 0
        ) {
          bestHand = evaluated;
        }
      }
    }

    return bestHand;
  }

  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    return null;
  }

  if (config.key === "fiveCardDraw") {
    return evaluateFiveCardHand(allCards.slice(0, 5));
  }

  return getBestFiveCardHand(allCards);
}

export function dealPokerVariantHands({
  variant = "texasHoldem",
  players = [],
  deck = shuffleDeck(),
}) {
  const config = getPokerVariantConfig(variant);
  const workingDeck = deck.slice();
  const dealtPlayers = players.map((player) => ({
    ...player,
    cards: [],
  }));

  for (let round = 0; round < config.holeCardCount; round += 1) {
    for (
      let playerIndex = 0;
      playerIndex < dealtPlayers.length;
      playerIndex += 1
    ) {
      if (workingDeck.length === 0) {
        break;
      }

      dealtPlayers[playerIndex].cards.push(workingDeck.shift());
    }
  }

  const communityCards = [];

  if (config.usesCommunityCards) {
    for (
      let cardIndex = 0;
      cardIndex < config.communityCardCount;
      cardIndex += 1
    ) {
      if (workingDeck.length === 0) {
        break;
      }

      communityCards.push(workingDeck.shift());
    }
  }

  return {
    players: dealtPlayers,
    communityCards,
    deck: workingDeck,
  };
}

export function drawReplacementCards(
  hand = [],
  discardIndexes = [],
  deck = [],
) {
  const discardSet = new Set(
    discardIndexes.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < hand.length,
    ),
  );

  const keptCards = hand.filter((_, index) => !discardSet.has(index));
  const drawCount = Math.min(hand.length - keptCards.length, deck.length);
  const drawnCards = deck.slice(0, drawCount);

  return {
    hand: [...keptCards, ...drawnCards],
    deck: deck.slice(drawCount),
  };
}

export function chooseFiveCardDrawDiscards(cards = [], difficulty = "medium") {
  const sortedCards = sortCardsDescending(cards);
  const rankGroups = new Map();
  const suitGroups = new Map();

  cards.forEach((card, index) => {
    const value = getCardValue(card);
    const suit = getCardSuit(card);

    if (!rankGroups.has(value)) {
      rankGroups.set(value, []);
    }
    rankGroups.get(value).push(index);

    if (!suitGroups.has(suit)) {
      suitGroups.set(suit, []);
    }
    suitGroups.get(suit).push(index);
  });

  const duplicateGroups = [...rankGroups.entries()]
    .map(([value, indexes]) => ({ value, indexes, count: indexes.length }))
    .filter((group) => group.count >= 2)
    .sort(
      (left, right) => right.count - left.count || right.value - left.value,
    );

  const keepIndexes = new Set();

  if (duplicateGroups.length > 0) {
    duplicateGroups.forEach((group) => {
      group.indexes.forEach((index) => keepIndexes.add(index));
    });

    const extraKeepCount =
      difficulty === "hard" ? 2 : difficulty === "medium" ? 1 : 0;
    const targetKeepCount = Math.min(
      cards.length,
      keepIndexes.size + extraKeepCount,
    );
    for (const card of sortedCards) {
      const cardIndex = cards.findIndex(
        (candidate, index) => candidate === card && !keepIndexes.has(index),
      );
      if (cardIndex !== -1) {
        keepIndexes.add(cardIndex);
      }
      if (keepIndexes.size >= targetKeepCount) {
        break;
      }
    }

    return cards
      .map((_, index) => (keepIndexes.has(index) ? null : index))
      .filter((value) => value !== null);
  }

  const flushDrawGroup = [...suitGroups.entries()]
    .map(([suit, indexes]) => ({ suit, indexes, count: indexes.length }))
    .sort((left, right) => right.count - left.count)[0];

  if (flushDrawGroup && flushDrawGroup.count >= 4) {
    flushDrawGroup.indexes.forEach((index) => keepIndexes.add(index));
  }

  const keepCount = difficulty === "hard" ? 4 : difficulty === "medium" ? 3 : 2;
  for (const card of sortedCards) {
    const cardIndex = cards.findIndex(
      (candidate, index) => candidate === card && !keepIndexes.has(index),
    );
    if (cardIndex !== -1) {
      keepIndexes.add(cardIndex);
    }

    if (keepIndexes.size >= keepCount) {
      break;
    }
  }

  return cards
    .map((_, index) => (keepIndexes.has(index) ? null : index))
    .filter((value) => value !== null);
}

export function getPokerHandLabel(result) {
  if (!result) {
    return "No hand";
  }

  return result.name ?? "Unknown hand";
}

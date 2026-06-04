const SUITS = ["hearts", "diamonds", "clubs", "spades"];

const SUIT_SYMBOLS = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_COLORS = {
  hearts: "red",
  diamonds: "red",
  clubs: "black",
  spades: "black",
};

const RANK_LABELS = {
  1: "A",
  11: "J",
  12: "Q",
  13: "K",
};

const PYRAMID_ROW_LENGTHS = [1, 2, 3, 4, 5, 6, 7];
const TRIPEAKS_ROW_LENGTHS = [3, 6, 9, 10];

export const VARIANT_OPTIONS = [
  {
    id: "klondike",
    label: "Klondike",
    description:
      "Classic build-up solitaire with stock, tableau, and foundations.",
  },
  {
    id: "spider",
    label: "Spider",
    description: "Build descending runs and clear King-to-Ace sequences.",
  },
  {
    id: "freecell",
    label: "FreeCell",
    description:
      "Use free cells to organize ordered stacks and finish foundations.",
  },
  {
    id: "pyramid",
    label: "Pyramid",
    description: "Remove pairs that add up to 13.",
  },
  {
    id: "tripeaks",
    label: "TriPeaks",
    description: "Clear cards one rank away from the waste card.",
  },
];

export const SPIDER_MODE_OPTIONS = [1, 2, 4].map((suitCount) => ({
  id: suitCount,
  label: `${suitCount}-suit`,
}));

export const SOLITAIRE_ACTIONS = {
  NEW_GAME: "solitaire/newGame",
  TAP: "solitaire/tap",
  MOVE: "solitaire/move",
  SET_SPIDER_MODE: "solitaire/setSpiderMode",
  UNDO: "solitaire/undo",
};

export function newGameAction(variantId, options = {}) {
  return {
    type: SOLITAIRE_ACTIONS.NEW_GAME,
    variantId,
    options,
  };
}

export function tapAction(target) {
  return {
    type: SOLITAIRE_ACTIONS.TAP,
    target,
  };
}

// Atomic drag-and-drop move: select `source`, then place on `target`, reusing
// the validated tap logic — no lingering selection state. Used by the drag UI.
export function moveAction(source, target) {
  return {
    type: SOLITAIRE_ACTIONS.MOVE,
    source,
    target,
  };
}

export function undoAction() {
  return { type: SOLITAIRE_ACTIONS.UNDO };
}

export function setSpiderModeAction(mode) {
  return {
    type: SOLITAIRE_ACTIONS.SET_SPIDER_MODE,
    mode,
  };
}

function normalizeVariantId(value) {
  const variantId = String(value || "klondike").toLowerCase();
  return VARIANT_OPTIONS.some((option) => option.id === variantId)
    ? variantId
    : "klondike";
}

function normalizeSpiderMode(value) {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 || parsed === 4 ? parsed : 4;
}

function createCard(suit, rank, id, faceUp = false) {
  return {
    id,
    suit,
    rank,
    color: SUIT_COLORS[suit],
    symbol: SUIT_SYMBOLS[suit],
    rankLabel: RANK_LABELS[rank] || String(rank),
    faceUp,
    faceDown: !faceUp,
    isFaceUp: faceUp,
    isFaceDown: !faceUp,
  };
}

function cloneCard(card, overrides = {}) {
  const nextFaceUp =
    Object.prototype.hasOwnProperty.call(overrides, "faceUp") &&
    overrides.faceUp != null
      ? overrides.faceUp
      : card.faceUp;

  return {
    ...card,
    ...overrides,
    faceUp: nextFaceUp,
    faceDown: !nextFaceUp,
    isFaceUp: nextFaceUp,
    isFaceDown: !nextFaceUp,
  };
}

function createStandardDeck(copyId = 0) {
  const cards = [];
  let index = 0;

  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      cards.push(createCard(suit, rank, `d${copyId}-${index}`));
      index += 1;
    }
  }

  return cards;
}

function createSpiderDeck(mode) {
  const suitCount = normalizeSpiderMode(mode);
  const suits =
    suitCount === 1
      ? ["spades"]
      : suitCount === 2
        ? ["spades", "hearts"]
        : SUITS.slice();
  const cards = [];
  let index = 0;

  for (const suit of suits) {
    const copiesPerSuit = 8 / suits.length;
    for (let copy = 0; copy < copiesPerSuit; copy += 1) {
      for (let rank = 1; rank <= 13; rank += 1) {
        cards.push(createCard(suit, rank, `s${suit}-${copy}-${index}`));
        index += 1;
      }
    }
  }

  return cards;
}

function shuffle(cards) {
  const next = cards.slice();
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = temp;
  }
  return next;
}

function topCard(pile) {
  return pile && pile.length > 0 ? pile[pile.length - 1] : null;
}

function sameTarget(a, b) {
  if (!a || !b) {
    return false;
  }

  return (
    a.type === b.type &&
    a.index === b.index &&
    a.row === b.row &&
    a.col === b.col &&
    a.cardIndex === b.cardIndex
  );
}

function isRed(card) {
  return card && (card.suit === "hearts" || card.suit === "diamonds");
}

function isDescendingAlternating(sequence) {
  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const next = sequence[index + 1];
    if (!current.faceUp || !next.faceUp) {
      return false;
    }
    if (current.rank !== next.rank + 1) {
      return false;
    }
    if (isRed(current) === isRed(next)) {
      return false;
    }
  }
  return true;
}

function isDescendingSameSuit(sequence) {
  for (let index = 0; index < sequence.length - 1; index += 1) {
    const current = sequence[index];
    const next = sequence[index + 1];
    if (!current.faceUp || !next.faceUp) {
      return false;
    }
    if (current.rank !== next.rank + 1) {
      return false;
    }
    if (current.suit !== next.suit) {
      return false;
    }
  }
  return true;
}

function sequenceFromTableau(
  tableau,
  pileIndex,
  cardIndex,
  requireSameSuit = false,
) {
  const pile = tableau[pileIndex] || [];
  if (cardIndex < 0 || cardIndex >= pile.length) {
    return null;
  }

  const sequence = pile.slice(cardIndex);
  if (!sequence[0] || !sequence[0].faceUp) {
    return null;
  }

  const valid = requireSameSuit
    ? isDescendingSameSuit(sequence)
    : isDescendingAlternating(sequence);
  return valid ? sequence : null;
}

function canPlaceOnTableau(card, pile) {
  const top = topCard(pile);
  if (!top) {
    return true;
  }

  return top.faceUp && top.rank === card.rank + 1 && isRed(top) !== isRed(card);
}

function canPlaceOnSpiderTableau(card, pile) {
  const top = topCard(pile);
  if (!top) {
    return true;
  }

  return top.faceUp && top.rank === card.rank + 1;
}

function canPlaceOnFoundation(card, pile) {
  const top = topCard(pile);
  if (!top) {
    return card.rank === 1;
  }

  return card.suit === top.suit && card.rank === top.rank + 1;
}

function drawOneFromStock(stock, waste) {
  let nextStock = stock.slice();
  let nextWaste = waste.slice();

  if (nextStock.length === 0 && nextWaste.length > 0) {
    nextStock = nextWaste
      .slice()
      .reverse()
      .map((card) => cloneCard(card, { faceUp: false }));
    nextWaste = [];
  }

  if (nextStock.length === 0) {
    return { stock: nextStock, waste: nextWaste, drawn: null };
  }

  const drawn = cloneCard(nextStock[nextStock.length - 1], { faceUp: true });
  nextStock = nextStock.slice(0, -1);
  nextWaste = nextWaste.concat(drawn);

  return { stock: nextStock, waste: nextWaste, drawn };
}

function drawSpiderRow(state) {
  if (state.stock.length === 0) {
    return state;
  }

  if (state.tableau.some((pile) => pile.length === 0)) {
    return state;
  }

  const nextTableau = state.tableau.map((pile) => pile.slice());
  let nextStock = state.stock.slice();

  for (let column = 0; column < nextTableau.length; column += 1) {
    const card = nextStock[nextStock.length - 1];
    nextStock = nextStock.slice(0, -1);
    nextTableau[column].push(cloneCard(card, { faceUp: true }));
  }

  return {
    ...state,
    stock: nextStock,
    tableau: nextTableau,
    moves: state.moves + 1,
    message: "Dealt a Spider row.",
  };
}

function createKlondikeState() {
  const deck = shuffle(createStandardDeck(0));
  const tableau = Array.from({ length: 7 }, () => []);
  let index = 0;

  for (let column = 0; column < tableau.length; column += 1) {
    for (let depth = 0; depth <= column; depth += 1) {
      tableau[column].push(
        cloneCard(deck[index], { faceUp: depth === column }),
      );
      index += 1;
    }
  }

  const stock = deck
    .slice(index)
    .map((card) => cloneCard(card, { faceUp: false }));

  return {
    variantId: "klondike",
    variantLabel: "Klondike",
    spiderMode: 4,
    options: { spiderMode: 4 },
    selected: null,
    status: "playing",
    message: "Build foundations from Ace to King.",
    moves: 0,
    pairs: 0,
    combo: 0,
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    history: [],
  };
}

function createSpiderState(mode = 4) {
  const spiderMode = normalizeSpiderMode(mode);
  const deck = shuffle(createSpiderDeck(spiderMode));
  const tableau = Array.from({ length: 10 }, () => []);
  const dealCounts = [6, 6, 6, 6, 5, 5, 5, 5, 5, 5];
  let index = 0;

  for (let column = 0; column < tableau.length; column += 1) {
    for (let depth = 0; depth < dealCounts[column]; depth += 1) {
      tableau[column].push(
        cloneCard(deck[index], { faceUp: depth === dealCounts[column] - 1 }),
      );
      index += 1;
    }
  }

  const stock = deck
    .slice(index)
    .map((card) => cloneCard(card, { faceUp: false }));

  return {
    variantId: "spider",
    variantLabel: "Spider",
    spiderMode,
    options: { spiderMode },
    selected: null,
    status: "playing",
    message: `${spiderMode}-suit Spider: build same-suit runs from King to Ace.`,
    moves: 0,
    pairs: 0,
    combo: 0,
    stock,
    waste: [],
    completedRuns: 0,
    tableau,
    history: [],
  };
}

function createFreeCellState() {
  const deck = shuffle(createStandardDeck(0));
  const tableau = Array.from({ length: 8 }, () => []);

  deck.forEach((card, index) => {
    tableau[index % 8].push(cloneCard(card, { faceUp: true }));
  });

  return {
    variantId: "freecell",
    variantLabel: "FreeCell",
    spiderMode: 4,
    options: { spiderMode: 4 },
    selected: null,
    status: "playing",
    message: "Use the free cells to organize ordered stacks.",
    moves: 0,
    pairs: 0,
    combo: 0,
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    freecells: [null, null, null, null],
    tableau,
    history: [],
  };
}

function syncPyramidVisibility(rows) {
  return rows.map((row, rowIndex) =>
    row.map((card, colIndex) => {
      if (!card) {
        return null;
      }

      const exposed = isPyramidExposed(rows, rowIndex, colIndex);
      return cloneCard(card, { faceUp: exposed });
    }),
  );
}

function isPyramidExposed(rows, rowIndex, colIndex) {
  if (rowIndex === rows.length - 1) {
    return true;
  }

  const nextRow = rows[rowIndex + 1] || [];
  return !nextRow[colIndex] && !nextRow[colIndex + 1];
}

function syncTriPeaksVisibility(rows) {
  return rows.map((row, rowIndex) =>
    row.map((card, colIndex) => {
      if (!card) {
        return null;
      }

      const exposed = isTriPeaksExposed(rows, rowIndex, colIndex);
      return cloneCard(card, { faceUp: exposed });
    }),
  );
}

function isTriPeaksExposed(rows, rowIndex, colIndex) {
  if (rowIndex === rows.length - 1) {
    return true;
  }

  const nextRow = rows[rowIndex + 1] || [];
  return !nextRow[colIndex] && !nextRow[colIndex + 1];
}

function createPyramidState() {
  const deck = shuffle(createStandardDeck(0));
  const pyramidRows = [];
  let index = 0;

  for (let row = 0; row < PYRAMID_ROW_LENGTHS.length; row += 1) {
    const rowCards = [];
    for (let col = 0; col < PYRAMID_ROW_LENGTHS[row]; col += 1) {
      rowCards.push(cloneCard(deck[index], { faceUp: false }));
      index += 1;
    }
    pyramidRows.push(rowCards);
  }

  const stock = deck
    .slice(index)
    .map((card) => cloneCard(card, { faceUp: false }));

  return {
    variantId: "pyramid",
    variantLabel: "Pyramid",
    spiderMode: 4,
    options: { spiderMode: 4 },
    selected: null,
    status: "playing",
    message: "Remove pairs that add up to 13.",
    moves: 0,
    pairs: 0,
    stock,
    waste: [],
    pyramidRows: syncPyramidVisibility(pyramidRows),
    history: [],
  };
}

function createTriPeaksState() {
  const deck = shuffle(createStandardDeck(0));
  const boardRows = [];
  let index = 0;

  for (let row = 0; row < TRIPEAKS_ROW_LENGTHS.length; row += 1) {
    const rowCards = [];
    for (let col = 0; col < TRIPEAKS_ROW_LENGTHS[row]; col += 1) {
      rowCards.push(cloneCard(deck[index], { faceUp: false }));
      index += 1;
    }
    boardRows.push(rowCards);
  }

  const stock = deck
    .slice(index)
    .map((card) => cloneCard(card, { faceUp: false }));

  return {
    variantId: "tripeaks",
    variantLabel: "TriPeaks",
    spiderMode: 4,
    options: { spiderMode: 4 },
    selected: null,
    status: "playing",
    message: "Clear cards one rank away from the waste card.",
    moves: 0,
    stock,
    waste: [
      cloneCard(stock.length > 0 ? stock[0] : createStandardDeck(0)[0], {
        faceUp: true,
      }),
    ].slice(0, 0),
    boardRows: syncTriPeaksVisibility(boardRows),
  };
}

function createEmptyWasteDrawState(stock) {
  const draw = drawOneFromStock(stock, []);
  return {
    stock: draw.stock,
    waste: draw.waste,
  };
}

function createTriPeaksSafeState() {
  const deck = shuffle(createStandardDeck(0));
  const boardRows = [];
  let index = 0;

  for (let row = 0; row < TRIPEAKS_ROW_LENGTHS.length; row += 1) {
    const rowCards = [];
    for (let col = 0; col < TRIPEAKS_ROW_LENGTHS[row]; col += 1) {
      rowCards.push(cloneCard(deck[index], { faceUp: false }));
      index += 1;
    }
    boardRows.push(rowCards);
  }

  const stock = deck
    .slice(index)
    .map((card) => cloneCard(card, { faceUp: false }));
  const initialDraw = drawOneFromStock(stock, []);

  return {
    variantId: "tripeaks",
    variantLabel: "TriPeaks",
    spiderMode: 4,
    options: { spiderMode: 4 },
    selected: null,
    status: "playing",
    message: "Clear cards one rank away from the waste card.",
    moves: 0,
    combo: 0,
    stock: initialDraw.stock,
    waste: initialDraw.waste,
    boardRows: syncTriPeaksVisibility(boardRows),
    history: [],
  };
}

function createInitialState(variantId, options = {}) {
  const normalizedVariantId = normalizeVariantId(variantId);

  if (normalizedVariantId === "spider") {
    return createSpiderState(options.spiderMode);
  }

  if (normalizedVariantId === "freecell") {
    return createFreeCellState();
  }

  if (normalizedVariantId === "pyramid") {
    return createPyramidState();
  }

  if (normalizedVariantId === "tripeaks") {
    return createTriPeaksSafeState();
  }

  return createKlondikeState();
}

function moveTableauStack(tableau, sourceIndex, cardIndex, destinationIndex) {
  const nextTableau = tableau.map((pile) => pile.slice());
  const moving = nextTableau[sourceIndex].slice(cardIndex);
  nextTableau[sourceIndex] = nextTableau[sourceIndex].slice(0, cardIndex);
  nextTableau[destinationIndex] = nextTableau[destinationIndex].concat(moving);

  if (nextTableau[sourceIndex].length > 0) {
    nextTableau[sourceIndex][nextTableau[sourceIndex].length - 1] = cloneCard(
      nextTableau[sourceIndex][nextTableau[sourceIndex].length - 1],
      { faceUp: true },
    );
  }

  return nextTableau;
}

function moveTableauSingleToDestination(
  tableau,
  sourceIndex,
  cardIndex,
  destinationIndex,
) {
  const nextTableau = tableau.map((pile) => pile.slice());
  const moving = nextTableau[sourceIndex].splice(cardIndex, 1);
  nextTableau[destinationIndex] = nextTableau[destinationIndex].concat(moving);

  if (nextTableau[sourceIndex].length > 0) {
    nextTableau[sourceIndex][nextTableau[sourceIndex].length - 1] = cloneCard(
      nextTableau[sourceIndex][nextTableau[sourceIndex].length - 1],
      { faceUp: true },
    );
  }

  return nextTableau;
}

function removePyramidCards(rows, first, second = null) {
  const nextRows = rows.map((row) => row.map((card) => card));
  nextRows[first.row][first.col] = null;
  if (second) {
    nextRows[second.row][second.col] = null;
  }
  return syncPyramidVisibility(nextRows);
}

function removeTriPeaksCard(rows, row, col) {
  const nextRows = rows.map((currentRow) => currentRow.map((card) => card));
  nextRows[row][col] = null;
  return syncTriPeaksVisibility(nextRows);
}

function isBoardCleared(rows) {
  return rows.every((row) => row.every((card) => !card));
}

function countClearedCards(rows) {
  return rows.reduce(
    (sum, row) => sum + row.reduce((inner, card) => inner + (card ? 0 : 1), 0),
    0,
  );
}

function countCardsInFoundations(foundations) {
  return foundations.reduce((sum, pile) => sum + pile.length, 0);
}

function finalizeStatus(state) {
  const nextState = { ...state };

  if (
    (state.variantId === "klondike" || state.variantId === "freecell") &&
    countCardsInFoundations(state.foundations) === 52
  ) {
    return {
      ...nextState,
      status: "won",
      message: "You won!",
      selected: null,
    };
  }

  if (state.variantId === "spider" && state.completedRuns >= 8) {
    return {
      ...nextState,
      status: "won",
      message: "You won!",
      selected: null,
    };
  }

  if (state.variantId === "pyramid" && isBoardCleared(state.pyramidRows)) {
    return {
      ...nextState,
      status: "won",
      message: "You won!",
      selected: null,
    };
  }

  if (state.variantId === "tripeaks" && isBoardCleared(state.boardRows)) {
    return {
      ...nextState,
      status: "won",
      message: "You won!",
      selected: null,
    };
  }

  const stuck =
    (state.variantId === "klondike" && !klondikeHasMoves(state)) ||
    (state.variantId === "spider" &&
      state.stock.length === 0 &&
      !spiderHasMoves(state)) ||
    (state.variantId === "freecell" && !freeCellHasMoves(state)) ||
    (state.variantId === "pyramid" && !pyramidHasMoves(state)) ||
    (state.variantId === "tripeaks" && !triPeaksHasMoves(state));

  if (stuck) {
    return {
      ...nextState,
      status: "stuck",
      message: "No legal moves left.",
      selected: null,
    };
  }

  return {
    ...nextState,
    status: "playing",
  };
}

function klondikeHasMoves(state) {
  if (state.stock.length > 0 || state.waste.length > 0) {
    return true;
  }

  const wasteTop = topCard(state.waste);
  if (wasteTop) {
    if (
      state.foundations.some((pile) => canPlaceOnFoundation(wasteTop, pile))
    ) {
      return true;
    }
    if (state.tableau.some((pile) => canPlaceOnTableau(wasteTop, pile))) {
      return true;
    }
  }

  for (let pileIndex = 0; pileIndex < state.tableau.length; pileIndex += 1) {
    const pile = state.tableau[pileIndex];
    for (let cardIndex = 0; cardIndex < pile.length; cardIndex += 1) {
      const sequence = sequenceFromTableau(
        state.tableau,
        pileIndex,
        cardIndex,
        false,
      );
      if (!sequence) {
        continue;
      }

      const movingCard = sequence[0];
      if (
        state.foundations.some((foundation) =>
          canPlaceOnFoundation(movingCard, foundation),
        )
      ) {
        return true;
      }

      if (
        state.tableau.some(
          (destinationPile, destinationIndex) =>
            destinationIndex !== pileIndex &&
            canPlaceOnTableau(movingCard, destinationPile),
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function spiderHasMoves(state) {
  if (state.stock.length > 0) {
    return true;
  }

  for (let pileIndex = 0; pileIndex < state.tableau.length; pileIndex += 1) {
    const pile = state.tableau[pileIndex];
    for (let cardIndex = 0; cardIndex < pile.length; cardIndex += 1) {
      const sequence = sequenceFromTableau(
        state.tableau,
        pileIndex,
        cardIndex,
        true,
      );
      if (!sequence) {
        continue;
      }

      const movingCard = sequence[0];
      if (
        state.tableau.some(
          (destinationPile, destinationIndex) =>
            destinationIndex !== pileIndex &&
            canPlaceOnSpiderTableau(movingCard, destinationPile),
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function freeCellHasMoves(state) {
  if (state.freecells.some((cell) => !cell)) {
    return true;
  }

  for (const card of state.freecells) {
    if (!card) {
      continue;
    }

    if (state.foundations.some((pile) => canPlaceOnFoundation(card, pile))) {
      return true;
    }

    if (state.tableau.some((pile) => canPlaceOnTableau(card, pile))) {
      return true;
    }
  }

  for (let pileIndex = 0; pileIndex < state.tableau.length; pileIndex += 1) {
    const pile = state.tableau[pileIndex];
    const firstFaceUp = pile.findIndex((card) => card.faceUp);
    if (firstFaceUp < 0) {
      continue;
    }

    const topCardFromTableau = pile[pile.length - 1];
    if (
      state.foundations.some((foundation) =>
        canPlaceOnFoundation(topCardFromTableau, foundation),
      )
    ) {
      return true;
    }

    if (state.freecells.some((cell) => !cell)) {
      return true;
    }

    const emptyColumns = state.tableau.filter(
      (column) => column.length === 0,
    ).length;
    const emptyFreecells = state.freecells.filter((cell) => !cell).length;
    const maxMovable = (emptyFreecells + 1) * Math.pow(2, emptyColumns);

    for (let cardIndex = firstFaceUp; cardIndex < pile.length; cardIndex += 1) {
      const sequence = sequenceFromTableau(
        state.tableau,
        pileIndex,
        cardIndex,
        false,
      );
      if (!sequence || sequence.length > maxMovable) {
        continue;
      }

      const movingCard = sequence[0];
      if (
        state.foundations.some((foundation) =>
          canPlaceOnFoundation(movingCard, foundation),
        )
      ) {
        return true;
      }

      if (
        state.tableau.some(
          (destinationPile, destinationIndex) =>
            destinationIndex !== pileIndex &&
            canPlaceOnTableau(movingCard, destinationPile),
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function pyramidHasMoves(state) {
  if (state.stock.length > 0 || state.waste.length > 0) {
    return true;
  }

  const wasteTop = topCard(state.waste);
  if (!wasteTop) {
    return false;
  }

  for (let row = 0; row < state.pyramidRows.length; row += 1) {
    for (let col = 0; col < state.pyramidRows[row].length; col += 1) {
      const card = state.pyramidRows[row][col];
      if (!card || !card.faceUp) {
        continue;
      }

      if (card.rank + wasteTop.rank === 13) {
        return true;
      }

      if (card.rank === 13) {
        return true;
      }
    }
  }

  return false;
}

function triPeaksHasMoves(state) {
  if (state.stock.length > 0 || state.waste.length > 0) {
    return true;
  }

  const wasteTop = topCard(state.waste);
  if (!wasteTop) {
    return false;
  }

  for (let row = 0; row < state.boardRows.length; row += 1) {
    for (let col = 0; col < state.boardRows[row].length; col += 1) {
      const card = state.boardRows[row][col];
      if (!card || !card.faceUp) {
        continue;
      }

      if (Math.abs(card.rank - wasteTop.rank) === 1) {
        return true;
      }
    }
  }

  return false;
}

function clearSelection(state) {
  return {
    ...state,
    selected: null,
  };
}

function setSelected(state, target) {
  return {
    ...state,
    selected: target,
  };
}

function klondikeMoveFromSelected(state, target) {
  const selected = state.selected;
  if (!selected) {
    return state;
  }

  if (selected.type === "waste") {
    const movingCard = topCard(state.waste);
    if (!movingCard) {
      return state;
    }

    if (
      target.type === "foundation" &&
      canPlaceOnFoundation(movingCard, state.foundations[target.index])
    ) {
      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        waste: state.waste.slice(0, -1),
        foundations: state.foundations.map((pile, index) =>
          index === target.index ? pile.concat(movingCard) : pile.slice(),
        ),
        message: "Moved a card to a foundation.",
      });
    }

    if (
      target.type === "tableau" &&
      target.index !== selected.index &&
      canPlaceOnTableau(movingCard, state.tableau[target.index])
    ) {
      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        waste: state.waste.slice(0, -1),
        tableau: state.tableau.map((pile, index) =>
          index === target.index ? pile.concat(movingCard) : pile.slice(),
        ),
        message: "Moved a card to the tableau.",
      });
    }

    return state;
  }

  if (selected.type === "tableau") {
    const sequence = sequenceFromTableau(
      state.tableau,
      selected.index,
      selected.cardIndex,
      false,
    );
    if (!sequence) {
      return state;
    }

    const movingCard = sequence[0];

    if (
      target.type === "foundation" &&
      sequence.length === 1 &&
      canPlaceOnFoundation(movingCard, state.foundations[target.index])
    ) {
      const nextTableau = moveTableauSingleToDestination(
        state.tableau,
        selected.index,
        selected.cardIndex,
        selected.index,
      );
      const sourcePile = state.tableau[selected.index].slice(
        0,
        selected.cardIndex,
      );
      const finalizedTableau = state.tableau.map((pile, index) =>
        index === selected.index ? sourcePile : pile.slice(),
      );

      if (finalizedTableau[selected.index].length > 0) {
        finalizedTableau[selected.index][
          finalizedTableau[selected.index].length - 1
        ] = cloneCard(
          finalizedTableau[selected.index][
            finalizedTableau[selected.index].length - 1
          ],
          { faceUp: true },
        );
      }

      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        tableau: finalizedTableau,
        foundations: state.foundations.map((pile, index) =>
          index === target.index ? pile.concat(movingCard) : pile.slice(),
        ),
        message: "Moved a card to a foundation.",
      });
    }

    if (
      target.type === "tableau" &&
      target.index !== selected.index &&
      canPlaceOnTableau(movingCard, state.tableau[target.index])
    ) {
      const nextTableau = moveTableauStack(
        state.tableau,
        selected.index,
        selected.cardIndex,
        target.index,
      );
      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        tableau: nextTableau,
        message: "Moved a stack.",
      });
    }
  }

  return state;
}

function handleKlondikeTap(state, target) {
  if (target.type === "stock") {
    const drawn = drawOneFromStock(state.stock, state.waste);
    return finalizeStatus({
      ...state,
      selected: null,
      moves: state.moves + 1,
      stock: drawn.stock,
      waste: drawn.waste,
      message: drawn.drawn ? "Drew a card." : "No cards left in stock.",
    });
  }

  if (sameTarget(state.selected, target)) {
    return clearSelection(state);
  }

  const moved = klondikeMoveFromSelected(state, target);
  if (moved !== state) {
    return moved;
  }

  if (target.type === "waste" && topCard(state.waste)) {
    return setSelected(state, { type: "waste" });
  }

  if (target.type === "tableau") {
    const pile = state.tableau[target.index] || [];
    const cardIndex =
      typeof target.cardIndex === "number"
        ? target.cardIndex
        : pile.findIndex((card) => card.faceUp);
    if (cardIndex >= 0) {
      const sequence = sequenceFromTableau(
        state.tableau,
        target.index,
        cardIndex,
        false,
      );
      if (sequence) {
        return setSelected(state, {
          type: "tableau",
          index: target.index,
          cardIndex,
        });
      }
    }
  }

  if (
    target.type === "foundation" &&
    topCard(state.foundations[target.index])
  ) {
    return setSelected(state, target);
  }

  return state;
}

function spiderResolveCompletedRuns(state) {
  let completedRuns = state.completedRuns || 0;

  const nextTableau = state.tableau.map((pile) => {
    let nextPile = pile.slice();

    while (nextPile.length >= 13) {
      const tail = nextPile.slice(nextPile.length - 13);
      const complete =
        isDescendingSameSuit(tail) &&
        tail[0].rank === 13 &&
        tail[tail.length - 1].rank === 1;
      if (!complete) {
        break;
      }

      nextPile = nextPile.slice(0, -13);
      completedRuns += 1;
    }

    if (nextPile.length > 0) {
      nextPile[nextPile.length - 1] = cloneCard(nextPile[nextPile.length - 1], {
        faceUp: true,
      });
    }

    return nextPile;
  });

  return {
    ...state,
    tableau: nextTableau,
    completedRuns,
  };
}

function handleSpiderTap(state, target) {
  if (target.type === "stock") {
    const dealt = drawSpiderRow(state);
    return finalizeStatus(
      spiderResolveCompletedRuns({
        ...dealt,
        selected: null,
      }),
    );
  }

  if (sameTarget(state.selected, target)) {
    return clearSelection(state);
  }

  if (
    state.selected &&
    state.selected.type === "tableau" &&
    target.type === "tableau"
  ) {
    const sequence = sequenceFromTableau(
      state.tableau,
      state.selected.index,
      state.selected.cardIndex,
      true,
    );
    if (!sequence) {
      return state;
    }

    const movingCard = sequence[0];
    if (!canPlaceOnSpiderTableau(movingCard, state.tableau[target.index])) {
      return state;
    }

    const nextTableau = state.tableau.map((pile, index) => {
      if (index === state.selected.index) {
        return pile.slice(0, state.selected.cardIndex);
      }

      if (index === target.index) {
        return pile.concat(sequence);
      }

      return pile.slice();
    });

    return finalizeStatus(
      spiderResolveCompletedRuns({
        ...state,
        selected: null,
        moves: state.moves + 1,
        tableau: nextTableau,
        message: "Moved a Spider run.",
      }),
    );
  }

  if (target.type === "tableau") {
    const pile = state.tableau[target.index] || [];
    const cardIndex =
      typeof target.cardIndex === "number"
        ? target.cardIndex
        : pile.findIndex((card) => card.faceUp);

    if (cardIndex >= 0) {
      const sequence = sequenceFromTableau(
        state.tableau,
        target.index,
        cardIndex,
        true,
      );
      if (sequence) {
        return setSelected(state, {
          type: "tableau",
          index: target.index,
          cardIndex,
        });
      }
    }
  }

  return state;
}

function moveFreeCellSelectedToTarget(state, target) {
  const selected = state.selected;
  if (!selected) {
    return state;
  }

  if (selected.type === "freecell") {
    const movingCard = state.freecells[selected.index];
    if (!movingCard) {
      return state;
    }

    if (
      target.type === "foundation" &&
      canPlaceOnFoundation(movingCard, state.foundations[target.index])
    ) {
      const nextFreecells = state.freecells.slice();
      nextFreecells[selected.index] = null;

      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        freecells: nextFreecells,
        foundations: state.foundations.map((pile, index) =>
          index === target.index ? pile.concat(movingCard) : pile.slice(),
        ),
        message: "Moved a card to a foundation.",
      });
    }

    if (
      target.type === "tableau" &&
      canPlaceOnTableau(movingCard, state.tableau[target.index])
    ) {
      const nextFreecells = state.freecells.slice();
      nextFreecells[selected.index] = null;

      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        freecells: nextFreecells,
        tableau: state.tableau.map((pile, index) =>
          index === target.index ? pile.concat(movingCard) : pile.slice(),
        ),
        message: "Moved a card from a free cell.",
      });
    }
  }

  if (selected.type === "tableau") {
    const sequence = sequenceFromTableau(
      state.tableau,
      selected.index,
      selected.cardIndex,
      false,
    );
    if (!sequence) {
      return state;
    }

    const movingCard = sequence[0];
    const emptyFreecells = state.freecells.filter((cell) => !cell).length;
    const emptyColumns = state.tableau.filter(
      (pile) => pile.length === 0,
    ).length;
    const maxMovable = (emptyFreecells + 1) * Math.pow(2, emptyColumns);

    if (sequence.length > maxMovable) {
      return state;
    }

    if (
      target.type === "freecell" &&
      sequence.length === 1 &&
      !state.freecells[target.index]
    ) {
      const nextFreecells = state.freecells.slice();
      nextFreecells[target.index] = movingCard;

      const nextTableau = state.tableau.map((pile, index) =>
        index === selected.index
          ? pile.slice(0, selected.cardIndex)
          : pile.slice(),
      );

      if (nextTableau[selected.index].length > 0) {
        nextTableau[selected.index][nextTableau[selected.index].length - 1] =
          cloneCard(
            nextTableau[selected.index][nextTableau[selected.index].length - 1],
            { faceUp: true },
          );
      }

      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        freecells: nextFreecells,
        tableau: nextTableau,
        message: "Moved a card to a free cell.",
      });
    }

    if (
      target.type === "foundation" &&
      sequence.length === 1 &&
      canPlaceOnFoundation(movingCard, state.foundations[target.index])
    ) {
      const nextTableau = state.tableau.map((pile, index) =>
        index === selected.index
          ? pile.slice(0, selected.cardIndex)
          : pile.slice(),
      );

      if (nextTableau[selected.index].length > 0) {
        nextTableau[selected.index][nextTableau[selected.index].length - 1] =
          cloneCard(
            nextTableau[selected.index][nextTableau[selected.index].length - 1],
            { faceUp: true },
          );
      }

      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        foundations: state.foundations.map((pile, index) =>
          index === target.index ? pile.concat(movingCard) : pile.slice(),
        ),
        tableau: nextTableau,
        message: "Moved a card to a foundation.",
      });
    }

    if (
      target.type === "tableau" &&
      target.index !== selected.index &&
      canPlaceOnTableau(movingCard, state.tableau[target.index])
    ) {
      const nextTableau = state.tableau.map((pile, index) => {
        if (index === selected.index) {
          return pile.slice(0, selected.cardIndex);
        }

        if (index === target.index) {
          return pile.concat(sequence);
        }

        return pile.slice();
      });

      if (nextTableau[selected.index].length > 0) {
        nextTableau[selected.index][nextTableau[selected.index].length - 1] =
          cloneCard(
            nextTableau[selected.index][nextTableau[selected.index].length - 1],
            { faceUp: true },
          );
      }

      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        tableau: nextTableau,
        message: "Moved a sequence.",
      });
    }
  }

  return state;
}

function handleFreeCellTap(state, target) {
  if (sameTarget(state.selected, target)) {
    return clearSelection(state);
  }

  const moved = moveFreeCellSelectedToTarget(state, target);
  if (moved !== state) {
    return moved;
  }

  if (target.type === "freecell" && state.freecells[target.index]) {
    return setSelected(state, { type: "freecell", index: target.index });
  }

  if (target.type === "tableau") {
    const pile = state.tableau[target.index] || [];
    const cardIndex =
      typeof target.cardIndex === "number"
        ? target.cardIndex
        : pile.findIndex((card) => card.faceUp);

    if (cardIndex >= 0) {
      const sequence = sequenceFromTableau(
        state.tableau,
        target.index,
        cardIndex,
        false,
      );
      if (sequence) {
        return setSelected(state, {
          type: "tableau",
          index: target.index,
          cardIndex,
        });
      }
    }
  }

  if (
    target.type === "foundation" &&
    topCard(state.foundations[target.index])
  ) {
    return setSelected(state, target);
  }

  return state;
}

function handlePyramidTap(state, target) {
  if (target.type === "stock") {
    const draw = drawOneFromStock(state.stock, state.waste);
    return finalizeStatus({
      ...state,
      selected: null,
      moves: state.moves + 1,
      stock: draw.stock,
      waste: draw.waste,
      message: draw.drawn ? "Drew a card." : "No cards left in stock.",
    });
  }

  if (sameTarget(state.selected, target)) {
    return clearSelection(state);
  }

  if (target.type === "waste") {
    if (topCard(state.waste)) {
      return setSelected(state, { type: "waste" });
    }
    return state;
  }

  if (target.type === "pyramid") {
    const card =
      state.pyramidRows[target.row] &&
      state.pyramidRows[target.row][target.col];
    if (!card || !card.faceUp) {
      return state;
    }

    const wasteTop = topCard(state.waste);

    if (wasteTop && card.rank + wasteTop.rank === 13) {
      const nextRows = removePyramidCards(state.pyramidRows, target);
      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        pyramidRows: nextRows,
        waste: state.waste.slice(0, -1),
        pairs: (state.pairs ?? 0) + 1,
        message: "Removed a pair.",
      });
    }

    if (card.rank === 13 && !wasteTop) {
      const nextRows = removePyramidCards(state.pyramidRows, target);
      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        pyramidRows: nextRows,
        message: "Removed a king.",
      });
    }

    if (
      state.selected &&
      state.selected.type === "waste" &&
      wasteTop &&
      card.rank + wasteTop.rank === 13
    ) {
      const nextRows = removePyramidCards(state.pyramidRows, target);
      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        pyramidRows: nextRows,
        waste: state.waste.slice(0, -1),
        pairs: (state.pairs ?? 0) + 1,
        message: "Removed a pair.",
      });
    }

    return setSelected(state, target);
  }

  return state;
}

function handleTriPeaksTap(state, target) {
  if (target.type === "stock") {
    const draw = drawOneFromStock(state.stock, state.waste);
    return finalizeStatus({
      ...state,
      selected: null,
      moves: state.moves + 1,
      combo: 0,
      stock: draw.stock,
      waste: draw.waste,
      message: draw.drawn ? "Drew a card." : "No cards left in stock.",
    });
  }

  if (sameTarget(state.selected, target)) {
    return clearSelection(state);
  }

  if (target.type === "waste") {
    if (topCard(state.waste)) {
      return setSelected(state, { type: "waste" });
    }
    return state;
  }

  if (target.type === "tripeaks") {
    const card =
      state.boardRows[target.row] && state.boardRows[target.row][target.col];
    if (!card || !card.faceUp) {
      return state;
    }

    const wasteTop = topCard(state.waste);
    const legal = wasteTop && Math.abs(card.rank - wasteTop.rank) === 1;

    if (legal) {
      const nextRows = removeTriPeaksCard(
        state.boardRows,
        target.row,
        target.col,
      );
      return finalizeStatus({
        ...state,
        selected: null,
        moves: state.moves + 1,
        boardRows: nextRows,
        waste: state.waste.concat(cloneCard(card, { faceUp: true })),
        combo: (state.combo ?? 0) + 1,
        message: "Cleared a card.",
      });
    }

    return setSelected(state, target);
  }

  return state;
}

export function createSolitaireState(variantId, options = {}) {
  return createInitialState(variantId, options);
}

export function getVariantOption(variantId) {
  const normalizedVariantId = normalizeVariantId(variantId);
  return (
    VARIANT_OPTIONS.find((option) => option.id === normalizedVariantId) ||
    VARIANT_OPTIONS[0]
  );
}

export function getTopCard(pile) {
  return topCard(pile);
}

export function getCardDisplayLabel(card) {
  if (!card) {
    return "";
  }

  return `${card.rankLabel || card.rank}${card.symbol || ""}`;
}

export function getSelectedIsTarget(state, target) {
  return sameTarget(state && state.selected, target);
}

export function getPyramidRowLengths() {
  return PYRAMID_ROW_LENGTHS.slice();
}

export function getTriPeaksRowLengths() {
  return TRIPEAKS_ROW_LENGTHS.slice();
}

export function getSpiderModeOptions() {
  return SPIDER_MODE_OPTIONS.slice();
}

export function solitaireReducer(state, action) {
  if (!state) {
    return createInitialState(
      action && action.variantId,
      action && action.options,
    );
  }

  switch (action && action.type) {
    case SOLITAIRE_ACTIONS.NEW_GAME:
      return createInitialState(
        action.variantId || state.variantId,
        action.options || state.options || { spiderMode: state.spiderMode },
      );

    case SOLITAIRE_ACTIONS.SET_SPIDER_MODE:
      if (state.variantId !== "spider") {
        return state;
      }
      return createInitialState("spider", {
        spiderMode: normalizeSpiderMode(action.mode),
      });

    case SOLITAIRE_ACTIONS.UNDO: {
      if (!state.history || state.history.length === 0) return state;
      const prevSnap = state.history[state.history.length - 1];
      return {
        ...prevSnap,
        history: state.history.slice(0, -1),
      };
    }

    case SOLITAIRE_ACTIONS.MOVE: {
      // Drag-and-drop: select the source then place on the target, reusing the
      // validated tap logic. Start from a clean selection so a prior tap-select
      // can't interfere.
      const clean = { ...state, selected: null };
      const afterSelect = solitaireReducer(clean, tapAction(action.source));
      const afterPlace = solitaireReducer(
        afterSelect,
        tapAction(action.target),
      );

      const moved =
        afterPlace.moves !== state.moves || afterPlace.pairs !== state.pairs;
      if (!moved) {
        // Invalid drop — leave the board untouched, just clear any selection.
        return { ...state, selected: null };
      }

      // Record a single, correct undo entry: the pre-move board (the internal
      // taps would otherwise leave a "source selected" snapshot).
      const { history: _h, ...preMove } = clean;
      const history =
        afterPlace.status === "won" ? [] : [...(state.history || []), preMove];
      return { ...afterPlace, selected: null, history };
    }

    case SOLITAIRE_ACTIONS.TAP: {
      let nextState = state;

      if (state.variantId === "klondike") {
        nextState = handleKlondikeTap(state, action.target);
      } else if (state.variantId === "spider") {
        nextState = handleSpiderTap(state, action.target);
      } else if (state.variantId === "freecell") {
        nextState = handleFreeCellTap(state, action.target);
      } else if (state.variantId === "pyramid") {
        nextState = handlePyramidTap(state, action.target);
      } else if (state.variantId === "tripeaks") {
        nextState = handleTriPeaksTap(state, action.target);
      }

      const next = finalizeStatus({
        ...nextState,
        options: nextState.options || { spiderMode: nextState.spiderMode || 4 },
      });

      // Only record undo history when moves actually changed (not selection-only taps)
      if (next.moves === state.moves && next.pairs === state.pairs) return next;

      // On win, clear history (can't undo past winning)
      if (next.status === "won") return { ...next, history: [] };

      // Push a history-free snapshot of current state
      const { history: _h, ...prevForHistory } = state;
      return {
        ...next,
        history: [...(state.history || []), prevForHistory],
      };
    }

    default:
      return state;
  }
}

// Drag-and-drop helper: the list of target descriptors `source` can legally
// move to right now. It works by simulating `moveAction(source, candidate)` for
// each pile and keeping the candidates that actually change the board. Because
// it reuses the same validated move path a real drop uses, the targets we
// highlight while dragging are guaranteed to match what a drop will accept —
// there's no parallel rule-checking that could drift out of sync.
export function getLegalTargets(state, source) {
  if (!state || !source) return [];

  const candidates = [];
  for (let i = 0; i < (state.foundations || []).length; i += 1) {
    candidates.push({ type: "foundation", index: i });
  }
  for (let i = 0; i < (state.tableau || []).length; i += 1) {
    // A column can't be a target for cards already in that same column.
    if (source.type === "tableau" && source.index === i) continue;
    candidates.push({ type: "tableau", index: i });
  }

  return candidates.filter((target) => {
    const result = solitaireReducer(state, moveAction(source, target));
    return result.moves !== state.moves || result.pairs !== state.pairs;
  });
}

export function isCardRed(card) {
  return isRed(card);
}

export function isKlondikeCardMoveLegal(card, foundationPile, tableauPile) {
  return (
    canPlaceOnFoundation(card, foundationPile) ||
    canPlaceOnTableau(card, tableauPile)
  );
}

export function isSpiderCardMoveLegal(card, tableauPile) {
  return canPlaceOnSpiderTableau(card, tableauPile);
}

export function isFreeCellCardMoveLegal(card, foundationPile, tableauPile) {
  return (
    canPlaceOnFoundation(card, foundationPile) ||
    canPlaceOnTableau(card, tableauPile)
  );
}

export function isPyramidBoardExposed(rows, rowIndex, colIndex) {
  return isPyramidExposed(rows, rowIndex, colIndex);
}

export function isTriPeaksBoardExposed(rows, rowIndex, colIndex) {
  return isTriPeaksExposed(rows, rowIndex, colIndex);
}

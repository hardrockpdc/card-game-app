import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  createGame,
  flip,
  clearMismatch,
} from "../game/memory";

// Find the index of the OTHER copy of the card at `index` (its matching pair).
function partnerIndex(cards, index) {
  const target = cards[index];
  return cards.findIndex(
    (c, i) =>
      i !== index && c.rank === target.rank && c.suit === target.suit,
  );
}

// Find two indices whose cards do NOT match (different rank/suit).
function mismatchedPair(cards) {
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank !== cards[j].rank || cards[i].suit !== cards[j].suit) {
        return [i, j];
      }
    }
  }
  return [0, 1];
}

describe("memory: createGame", () => {
  test.each(DIFFICULTY_ORDER)("%s board has the right card count", (diff) => {
    const { pairs } = DIFFICULTIES[diff];
    const game = createGame(diff);
    expect(game.cards).toHaveLength(pairs * 2);
    expect(game.pairs).toBe(pairs);
    expect(game.status).toBe("playing");
    expect(game.matched).toBe(0);
    expect(game.moves).toBe(0);
  });

  test("every card has exactly one partner (all pairs present)", () => {
    const game = createGame("medium");
    for (let i = 0; i < game.cards.length; i++) {
      const matches = game.cards.filter(
        (c) => c.rank === game.cards[i].rank && c.suit === game.cards[i].suit,
      );
      expect(matches).toHaveLength(2);
    }
  });

  test("all card ids are unique and start face down", () => {
    const game = createGame("hard");
    const ids = new Set(game.cards.map((c) => c.id));
    expect(ids.size).toBe(game.cards.length);
    expect(game.cards.every((c) => !c.faceUp && !c.matched)).toBe(true);
  });

  test("unknown difficulty falls back to medium", () => {
    const game = createGame("bogus");
    expect(game.cards).toHaveLength(DIFFICULTIES.medium.pairs * 2);
  });
});

describe("memory: flip + matching", () => {
  test("flipping one card shows it and records no move yet", () => {
    const game = createGame("easy");
    const next = flip(game, 0);
    expect(next.cards[0].faceUp).toBe(true);
    expect(next.flipped).toEqual([0]);
    expect(next.moves).toBe(0);
  });

  test("a matching pair stays matched and clears the flipped list", () => {
    const game = createGame("easy");
    const j = partnerIndex(game.cards, 0);
    const s1 = flip(game, 0);
    const s2 = flip(s1, j);
    expect(s2.cards[0].matched).toBe(true);
    expect(s2.cards[j].matched).toBe(true);
    expect(s2.flipped).toEqual([]);
    expect(s2.moves).toBe(1);
    expect(s2.matched).toBe(1);
    expect(s2.locked).toBe(false);
  });

  test("a mismatch locks the board with both cards showing", () => {
    const game = createGame("medium");
    const [i, j] = mismatchedPair(game.cards);
    const s = flip(flip(game, i), j);
    expect(s.locked).toBe(true);
    expect(s.moves).toBe(1);
    expect(s.cards[i].faceUp).toBe(true);
    expect(s.cards[j].faceUp).toBe(true);
    expect(s.cards[i].matched).toBe(false);
  });

  test("clearMismatch flips the mismatched pair back down", () => {
    const game = createGame("medium");
    const [i, j] = mismatchedPair(game.cards);
    const locked = flip(flip(game, i), j);
    const cleared = clearMismatch(locked);
    expect(cleared.cards[i].faceUp).toBe(false);
    expect(cleared.cards[j].faceUp).toBe(false);
    expect(cleared.flipped).toEqual([]);
    expect(cleared.locked).toBe(false);
  });
});

describe("memory: illegal taps are no-ops", () => {
  test("tapping while locked does nothing", () => {
    const game = createGame("medium");
    const [i, j] = mismatchedPair(game.cards);
    const locked = flip(flip(game, i), j);
    const other = game.cards.findIndex((_, idx) => idx !== i && idx !== j);
    expect(flip(locked, other)).toBe(locked);
  });

  test("tapping an already face-up card does nothing", () => {
    const game = createGame("easy");
    const s = flip(game, 0);
    expect(flip(s, 0)).toBe(s);
  });

  test("tapping a matched card does nothing", () => {
    const game = createGame("easy");
    const j = partnerIndex(game.cards, 0);
    const matched = flip(flip(game, 0), j);
    expect(flip(matched, 0)).toBe(matched);
  });
});

describe("memory: winning", () => {
  test("matching every pair sets status to won", () => {
    let game = createGame("easy");
    const done = new Set();
    for (let i = 0; i < game.cards.length; i++) {
      if (done.has(i)) continue;
      const j = partnerIndex(game.cards, i);
      done.add(i);
      done.add(j);
      game = flip(flip(game, i), j);
    }
    expect(game.matched).toBe(game.pairs);
    expect(game.status).toBe("won");
    expect(game.moves).toBe(game.pairs); // perfect game = one move per pair
    expect(game.cards.every((c) => c.matched)).toBe(true);
  });

  test("no further flips register once won", () => {
    let game = createGame("easy");
    const done = new Set();
    for (let i = 0; i < game.cards.length; i++) {
      if (done.has(i)) continue;
      const j = partnerIndex(game.cards, i);
      done.add(i);
      done.add(j);
      game = flip(flip(game, i), j);
    }
    expect(flip(game, 0)).toBe(game);
  });
});

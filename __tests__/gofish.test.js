import {
  dealGoFish,
  doAsk,
  checkBooks,
  checkWin,
  nextTurn,
  pickGoFishAIMove,
} from "../game/gofish";

const c = (rank, suit) => ({ rank, suit, id: `${rank}${suit}` });
const total = (s) =>
  s.hands.a.length +
  (s.hands.b?.length ?? 0) +
  (s.hands.c?.length ?? 0) +
  s.ocean.length +
  4 * Object.values(s.books).reduce((n, b) => n + b.length, 0);

describe("dealGoFish", () => {
  test("2 players: conserves all 52 cards, starts playing", () => {
    const s = dealGoFish([{ id: "a" }, { id: "b" }]);
    expect(s.players).toHaveLength(2);
    expect(s.phase).toBe("playing");
    expect(total(s)).toBe(52);
  });

  test("3 players: deals 5 each (no immediate book is overwhelmingly likely)", () => {
    const s = dealGoFish([{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(total(s)).toBe(52);
  });
});

describe("checkBooks", () => {
  test("a 4-of-a-kind is removed from the hand and recorded as a book", () => {
    const state = {
      hands: {
        a: [c("7", "♠"), c("7", "♥"), c("7", "♦"), c("7", "♣"), c("K", "♠")],
      },
      books: { a: [] },
    };
    const next = checkBooks(state, "a");
    expect(next.hands.a.map((x) => x.rank)).toEqual(["K"]);
    expect(next.books.a).toEqual(["7"]);
  });
});

describe("checkWin", () => {
  test("declares the player with the most books when all 13 are made", () => {
    const state = {
      players: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      hands: { a: [], b: [] },
      ocean: [],
      books: {
        a: ["A", "2", "3", "4", "5", "6", "7"], // 7 books
        b: ["8", "9", "10", "J", "Q", "K"], // 6 books
      },
    };
    const next = checkWin(state);
    expect(next.phase).toBe("results");
    expect(next.winner.id).toBe("a");
  });

  test("keeps playing when the game isn't over", () => {
    const state = {
      players: [{ id: "a" }],
      hands: { a: [c("7", "♠")] },
      ocean: [c("2", "♣")],
      books: { a: [] },
    };
    expect(checkWin(state).phase).toBeUndefined();
  });
});

describe("nextTurn", () => {
  test("advances to the next player with wraparound", () => {
    const state = {
      players: [{ id: "a" }, { id: "b" }],
      hands: { a: [c("7", "♠")], b: [c("K", "♥")] },
      ocean: [],
      currentPlayerIndex: 1,
    };
    expect(nextTurn(state).currentPlayerIndex).toBe(0);
  });

  test("auto-draws a card for the next player if they're empty", () => {
    const state = {
      players: [{ id: "a" }, { id: "b" }],
      hands: { a: [c("7", "♠")], b: [] },
      ocean: [c("2", "♣")],
      currentPlayerIndex: 0,
    };
    const next = nextTurn(state);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.hands.b).toHaveLength(1);
    expect(next.ocean).toHaveLength(0);
  });
});

describe("doAsk", () => {
  const base = () => ({
    players: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    hands: { a: [c("7", "♠")], b: [c("7", "♥"), c("7", "♦")] },
    ocean: [c("2", "♣")],
    books: { a: [], b: [] },
    currentPlayerIndex: 0,
    history: [],
  });

  test("a successful ask transfers cards and grants an extra turn", () => {
    const next = doAsk(base(), "a", "b", "7");
    expect(next.hands.a).toHaveLength(3);
    expect(next.hands.b).toHaveLength(0);
    expect(next.extraTurn).toBe(true);
    expect(next.currentPlayerIndex).toBe(0); // same player goes again
  });

  test("a miss makes the asker go fish and passes the turn", () => {
    const state = {
      ...base(),
      hands: { a: [c("7", "♠")], b: [c("K", "♥")] }, // b has no 7
    };
    const next = doAsk(state, "a", "b", "7");
    expect(next.hands.a).toHaveLength(2); // drew from the ocean
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.extraTurn).toBe(false);
  });

  test("asking for a rank you don't hold is a no-op", () => {
    const state = base();
    expect(doAsk(state, "a", "b", "K")).toBe(state);
  });
});

describe("pickGoFishAIMove", () => {
  const opponents = [{ id: "b" }];

  test("easy: asks for a rank it actually holds", () => {
    const state = { hands: { ai: [c("9", "♠")] }, history: [] };
    const move = pickGoFishAIMove(state, "ai", opponents, "easy");
    expect(move.rank).toBe("9");
    expect(move.target.id).toBe("b");
  });

  test("medium: asks for the rank it has the most of", () => {
    const state = {
      hands: { ai: [c("7", "♠"), c("7", "♥"), c("7", "♦"), c("K", "♣")] },
      history: [],
    };
    const move = pickGoFishAIMove(state, "ai", opponents, "medium");
    expect(move.rank).toBe("7");
    expect(move.target.id).toBe("b");
  });
});

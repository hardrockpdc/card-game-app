import {
  CONQUIAN_RANKS,
  RANK_VAL,
  createConquianDeck,
  isValidSet,
  isValidRun,
  isValidMeld,
  canExtendMeld,
  getConfig,
  meldedCount,
} from "../game/conquian";

// Build a card. Conquian functions read `rank` and `suit`.
const c = (rank, suit) => ({ rank, suit, id: `${rank}${suit}` });
// Convenience: a run/set from "rank:suit" codes, e.g. set("7:s", "7:h", "7:d").
const cards = (...codes) =>
  codes.map((code) => {
    const [rank, suit] = code.split(":");
    return c(rank, suit);
  });

describe("createConquianDeck", () => {
  test("is a 40-card Mexican deck (10 ranks x 4 suits)", () => {
    expect(createConquianDeck()).toHaveLength(40);
  });

  test("omits 8, 9 and 10 entirely", () => {
    const ranks = new Set(createConquianDeck().map((card) => card.rank));
    expect(ranks.has("8")).toBe(false);
    expect(ranks.has("9")).toBe(false);
    expect(ranks.has("10")).toBe(false);
    expect([...ranks].sort()).toEqual([...CONQUIAN_RANKS].sort());
  });

  test("every card id is unique", () => {
    const ids = createConquianDeck().map((card) => card.id);
    expect(new Set(ids).size).toBe(40);
  });
});

describe("RANK_VAL — 7 and J are consecutive", () => {
  test("J directly follows 7 in sequence value", () => {
    expect(RANK_VAL.J).toBe(RANK_VAL["7"] + 1);
  });

  test("the high run 7-J-Q-K maps to consecutive values 7,8,9,10", () => {
    expect([RANK_VAL["7"], RANK_VAL.J, RANK_VAL.Q, RANK_VAL.K]).toEqual([
      7, 8, 9, 10,
    ]);
  });
});

describe("isValidSet", () => {
  test("accepts 3 of a kind in different suits", () => {
    expect(isValidSet(cards("7:s", "7:h", "7:d"))).toBe(true);
  });

  test("accepts 4 of a kind in different suits", () => {
    expect(isValidSet(cards("7:s", "7:h", "7:d", "7:c"))).toBe(true);
  });

  test("rejects a duplicate suit", () => {
    expect(isValidSet(cards("7:s", "7:h", "7:s"))).toBe(false);
  });

  test("rejects mixed ranks", () => {
    expect(isValidSet(cards("7:s", "7:h", "K:d"))).toBe(false);
  });

  test("rejects fewer than 3 or more than 4", () => {
    expect(isValidSet(cards("7:s", "7:h"))).toBe(false);
    expect(isValidSet(cards("7:s", "7:h", "7:d", "7:c", "7:s"))).toBe(false);
  });
});

describe("isValidRun", () => {
  test("accepts a simple same-suit run", () => {
    expect(isValidRun(cards("A:s", "2:s", "3:s"))).toBe(true);
  });

  test("accepts the signature 7-J-Q run (7 -> J is consecutive)", () => {
    expect(isValidRun(cards("7:s", "J:s", "Q:s"))).toBe(true);
  });

  test("accepts 6-7-J spanning the 7->J jump", () => {
    expect(isValidRun(cards("6:s", "7:s", "J:s"))).toBe(true);
  });

  test("accepts the full 7-J-Q-K high run", () => {
    expect(isValidRun(cards("7:s", "J:s", "Q:s", "K:s"))).toBe(true);
  });

  test("rejects a run with a gap (7-J-K skips Q)", () => {
    expect(isValidRun(cards("7:s", "J:s", "K:s"))).toBe(false);
  });

  test("rejects mixed suits", () => {
    expect(isValidRun(cards("5:s", "6:h", "7:s"))).toBe(false);
  });

  test("rejects fewer than 3 cards", () => {
    expect(isValidRun(cards("7:s", "J:s"))).toBe(false);
  });
});

describe("isValidMeld", () => {
  test("true for a valid set and a valid run", () => {
    expect(isValidMeld(cards("K:s", "K:h", "K:d"))).toBe(true);
    expect(isValidMeld(cards("5:s", "6:s", "7:s"))).toBe(true);
  });

  test("false for junk, short, or nullish input", () => {
    expect(isValidMeld(cards("2:s", "5:h", "K:d"))).toBe(false);
    expect(isValidMeld(cards("7:s", "7:h"))).toBe(false);
    expect(isValidMeld(null)).toBe(false);
    expect(isValidMeld(undefined)).toBe(false);
  });
});

describe("canExtendMeld", () => {
  test("a set can take a 4th card of a new suit", () => {
    const set = cards("7:s", "7:h", "7:d");
    expect(canExtendMeld(set, c("7", "c"))).toBe(true);
  });

  test("a set rejects a repeated suit", () => {
    const set = cards("7:s", "7:h", "7:d");
    expect(canExtendMeld(set, c("7", "s"))).toBe(false);
  });

  test("a full 4-card set cannot be extended", () => {
    const set = cards("7:s", "7:h", "7:d", "7:c");
    expect(canExtendMeld(set, c("7", "s"))).toBe(false);
  });

  test("a run extends at the low end", () => {
    const run = cards("5:s", "6:s", "7:s");
    expect(canExtendMeld(run, c("4", "s"))).toBe(true);
  });

  test("a run extends at the high end across 7->J", () => {
    const run = cards("5:s", "6:s", "7:s");
    expect(canExtendMeld(run, c("J", "s"))).toBe(true);
  });

  test("a run rejects a wrong-suit card", () => {
    const run = cards("5:s", "6:s", "7:s");
    expect(canExtendMeld(run, c("4", "h"))).toBe(false);
  });

  test("a run rejects a non-adjacent value", () => {
    const run = cards("5:s", "6:s", "7:s");
    expect(canExtendMeld(run, c("Q", "s"))).toBe(false);
  });
});

describe("getConfig — hand size & win target by player count", () => {
  test("2 players: hand 10, win 11", () => {
    expect(getConfig(2)).toEqual({ handSize: 10, winTarget: 11 });
    expect(getConfig(1)).toEqual({ handSize: 10, winTarget: 11 });
  });

  test("3 players: hand 8, win 9", () => {
    expect(getConfig(3)).toEqual({ handSize: 8, winTarget: 9 });
  });

  test("4+ players: hand 7, win 8", () => {
    expect(getConfig(4)).toEqual({ handSize: 7, winTarget: 8 });
    expect(getConfig(6)).toEqual({ handSize: 7, winTarget: 8 });
  });
});

describe("meldedCount", () => {
  test("sums card counts across a player's meld groups", () => {
    const state = {
      melds: {
        p1: [cards("7:s", "7:h", "7:d"), cards("5:s", "6:s", "7:s", "J:s")],
      },
    };
    expect(meldedCount(state, "p1")).toBe(7);
  });

  test("is 0 for a player with no melds", () => {
    expect(meldedCount({ melds: {} }, "p1")).toBe(0);
  });
});

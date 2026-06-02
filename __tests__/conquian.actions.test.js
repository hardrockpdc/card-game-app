import {
  deal,
  aiBestHandMeld,
  aiMostIsolated,
  aiCanTake,
} from "../game/conquian";

const c = (rank, suit) => ({ rank, suit, id: `${rank}${suit}` });

describe("deal", () => {
  test("2 players: 10 cards each, 20 in stock, win target 11", () => {
    const state = deal([{ id: "host" }, { id: "ai" }], { dealerIndex: 0 });
    expect(state.hands["host"]).toHaveLength(10);
    expect(state.hands["ai"]).toHaveLength(10);
    expect(state.stock).toHaveLength(20);
    expect(state.winTarget).toBe(11);
    expect(state.phase).toBe("initialPass");
  });

  test("first player sits to the dealer's left, melds start empty", () => {
    const state = deal([{ id: "host" }, { id: "ai" }], { dealerIndex: 0 });
    expect(state.currentPlayerIndex).toBe(1); // (dealer 0 + 1) % 2
    expect(state.melds["host"]).toEqual([]);
    expect(state.melds["ai"]).toEqual([]);
  });

  test("deals from a single 40-card deck with no duplicates", () => {
    const state = deal([{ id: "host" }, { id: "ai" }], { dealerIndex: 0 });
    const all = [
      ...state.hands["host"],
      ...state.hands["ai"],
      ...state.stock,
    ].map((card) => card.id);
    expect(all).toHaveLength(40);
    expect(new Set(all).size).toBe(40);
  });
});

describe("aiBestHandMeld", () => {
  test("finds a set in the hand", () => {
    const hand = [
      c("7", "♠"),
      c("7", "♥"),
      c("7", "♦"),
      c("K", "♠"),
      c("2", "♣"),
    ];
    const meld = aiBestHandMeld(hand);
    expect(meld).toEqual(expect.arrayContaining(["7♠", "7♥", "7♦"]));
    expect(meld).toHaveLength(3);
  });

  test("finds a run in the hand", () => {
    const hand = [c("5", "♠"), c("6", "♠"), c("7", "♠"), c("A", "♥")];
    const meld = aiBestHandMeld(hand);
    expect(meld).toEqual(expect.arrayContaining(["5♠", "6♠", "7♠"]));
  });

  test("returns null when there is no meld", () => {
    expect(aiBestHandMeld([c("2", "♠"), c("5", "♥"), c("K", "♦")])).toBeNull();
  });
});

describe("aiMostIsolated", () => {
  test("picks the card with no connections over a tight set", () => {
    const hand = [c("7", "♠"), c("7", "♥"), c("7", "♦"), c("K", "♣")];
    expect(aiMostIsolated(hand)).toBe("K♣");
  });

  test("returns null for an empty hand", () => {
    expect(aiMostIsolated([])).toBeNull();
  });
});

describe("aiCanTake", () => {
  test("forms a new set with the active card", () => {
    const state = {
      activeCard: c("7", "♦"),
      hands: { p1: [c("7", "♠"), c("7", "♥"), c("K", "♣")] },
      melds: { p1: [] },
    };
    const action = aiCanTake(state, "p1");
    expect(action.type).toBe("new");
    expect(action.handCardIds).toEqual(expect.arrayContaining(["7♠", "7♥"]));
  });

  test("extends an existing run with the active card", () => {
    const state = {
      activeCard: c("4", "♠"),
      hands: { p1: [c("K", "♥")] },
      melds: { p1: [[c("5", "♠"), c("6", "♠"), c("7", "♠")]] },
    };
    expect(aiCanTake(state, "p1")).toEqual({ type: "extend", meldIdx: 0 });
  });

  test("returns null when the active card can't be used", () => {
    const state = {
      activeCard: c("K", "♦"),
      hands: { p1: [c("2", "♠"), c("5", "♥")] },
      melds: { p1: [] },
    };
    expect(aiCanTake(state, "p1")).toBeNull();
  });
});

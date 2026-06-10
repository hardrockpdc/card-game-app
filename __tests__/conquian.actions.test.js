import {
  deal,
  aiBestHandMeld,
  aiMostIsolated,
  aiCanTake,
  forcedExtendIndex,
  doDrawFromStock,
  doPassActiveCard,
  doDiscardCard,
  doExtendMeldFromHand,
  doLayDownMeld,
} from "../game/conquian";

const c = (rank, suit) => ({ rank, suit, id: `${rank}${suit}` });

const RUN_567_S = [c("5", "♠"), c("6", "♠"), c("7", "♠")];

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

describe("doExtendMeldFromHand (free add-to-meld)", () => {
  const drawTurn = (over) => ({
    phase: "playing",
    turnPhase: "action",
    players: [{ id: "p1" }, { id: "p2" }],
    currentPlayerIndex: 0,
    originalDrawerIndex: 0, // p1's own draw turn
    chainPassedPids: [],
    activeCard: null,
    hands: { p1: [], p2: [] },
    melds: { p1: [], p2: [] },
    winTarget: 11,
    deadPile: [],
    autoTook: null,
    ...over,
  });

  test("adds 5♣ to a 2-3-4♣ run (the reported case)", () => {
    const s = drawTurn({
      melds: { p1: [[c("2", "♣"), c("3", "♣"), c("4", "♣")]], p2: [] },
      hands: { p1: [c("5", "♣"), c("K", "♥")], p2: [] },
    });
    const next = doExtendMeldFromHand(s, "p1", 0, ["5♣"]);
    expect(next).not.toBe(s);
    expect(next.melds.p1[0].map((x) => x.id)).toEqual(["2♣", "3♣", "4♣", "5♣"]);
    expect(next.hands.p1.map((x) => x.id)).toEqual(["K♥"]);
  });

  test("rejects a card that doesn't extend the run", () => {
    const s = drawTurn({
      melds: { p1: [[c("2", "♣"), c("3", "♣"), c("4", "♣")]], p2: [] },
      hands: { p1: [c("Q", "♣")], p2: [] },
    });
    expect(doExtendMeldFromHand(s, "p1", 0, ["Q♣"])).toBe(s);
  });

  test("is blocked when it's not your draw-turn free window", () => {
    const s = drawTurn({
      originalDrawerIndex: 1, // p1 is NOT the drawer → no free melds
      melds: { p1: [[c("2", "♣"), c("3", "♣"), c("4", "♣")]], p2: [] },
      hands: { p1: [c("5", "♣")], p2: [] },
    });
    expect(doExtendMeldFromHand(s, "p1", 0, ["5♣"])).toBe(s);
  });
});

describe("forcedExtendIndex", () => {
  test("returns the meld index a card directly extends", () => {
    const state = { activeCard: c("4", "♠"), melds: { p1: [RUN_567_S] } };
    expect(forcedExtendIndex(state, "p1")).toBe(0);
  });

  test("returns -1 when the card extends nothing / no active card", () => {
    expect(
      forcedExtendIndex({ activeCard: c("K", "♦"), melds: { p1: [RUN_567_S] } }, "p1"),
    ).toBe(-1);
    expect(forcedExtendIndex({ activeCard: null, melds: { p1: [] } }, "p1")).toBe(-1);
  });
});

describe("Auto-Take rule", () => {
  const playing = (over) => ({
    phase: "playing",
    players: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    currentPlayerIndex: 0,
    melds: { p1: [], p2: [], p3: [] },
    hands: { p1: [], p2: [], p3: [] },
    deadPile: [],
    chainPassedPids: [],
    activeCard: null,
    activeCardSourcePid: null,
    winTarget: 11,
    autoTook: null,
    ...over,
  });

  test("your own draw that extends a table meld is force-taken", () => {
    const next = doDrawFromStock(
      playing({
        turnPhase: "draw",
        stock: [c("4", "♠"), c("9", "♥")],
        melds: { p1: [RUN_567_S], p2: [], p3: [] },
        hands: { p1: [c("K", "♥"), c("Q", "♦")], p2: [], p3: [] },
      }),
    );
    expect(next.turnPhase).toBe("discard"); // forced take → must discard
    expect(next.activeCard).toBeNull();
    expect(next.melds.p1[0].map((x) => x.id)).toContain("4♠");
    expect(next.autoTook).toEqual({
      pid: "p1",
      id: "4♠",
      rank: "4",
      suit: "♠",
    });
  });

  test("a draw that extends nothing stays a normal action (no auto-take)", () => {
    const next = doDrawFromStock(
      playing({
        turnPhase: "draw",
        stock: [c("K", "♦")],
        melds: { p1: [RUN_567_S], p2: [], p3: [] },
        hands: { p1: [c("K", "♥")], p2: [], p3: [] },
      }),
    );
    expect(next.turnPhase).toBe("action");
    expect(next.activeCard.id).toBe("K♦");
    expect(next.autoTook).toBeNull();
  });

  test("you cannot pass a card that extends your meld", () => {
    const s = playing({
      turnPhase: "action",
      activeCard: c("4", "♠"),
      melds: { p1: [RUN_567_S], p2: [], p3: [] },
      activeCardSourcePid: "p2",
    });
    expect(doPassActiveCard(s)).toBe(s); // pass blocked — unchanged
  });

  test("clockwise order holds: it skips a player who can't extend and force-takes the one who can", () => {
    const s = playing({
      turnPhase: "discard",
      hands: { p1: [c("4", "♠"), c("K", "♥")], p2: [c("9", "♦")], p3: [] },
      // p2 can't extend; p3 can
      melds: { p1: [], p2: [], p3: [RUN_567_S] },
    });
    // p1 discards 4♠ → offered to p2 (no extend → normal action)
    const afterDiscard = doDiscardCard(s, "p1", "4♠");
    expect(afterDiscard.currentPlayerIndex).toBe(1);
    expect(afterDiscard.turnPhase).toBe("action");
    expect(afterDiscard.autoTook).toBeNull();
    // p2 passes → reaches p3 who is force-taken
    const afterPass = doPassActiveCard(afterDiscard);
    expect(afterPass.currentPlayerIndex).toBe(2);
    expect(afterPass.turnPhase).toBe("discard");
    expect(afterPass.melds.p3[0].map((x) => x.id)).toContain("4♠");
    expect(afterPass.autoTook).toEqual({
      pid: "p3",
      id: "4♠",
      rank: "4",
      suit: "♠",
    });
  });

  test("a forced take that hits the target wins immediately, no discard", () => {
    const next = doDrawFromStock(
      playing({
        turnPhase: "draw",
        stock: [c("4", "♠")],
        winTarget: 4,
        melds: { p1: [RUN_567_S], p2: [], p3: [] },
        hands: { p1: [c("K", "♥")], p2: [], p3: [] },
      }),
    );
    expect(next.phase).toBe("results");
    expect(next.winner.id).toBe("p1");
    expect(next.melds.p1[0]).toHaveLength(4);
  });

  test("last-card edge: forced take is still forced even if you must dump your last card", () => {
    const next = doDrawFromStock(
      playing({
        turnPhase: "draw",
        stock: [c("4", "♠")],
        winTarget: 11, // adding one card (melded 3→4) does NOT win
        melds: { p1: [RUN_567_S], p2: [], p3: [] },
        hands: { p1: [c("K", "♥")], p2: [], p3: [] },
      }),
    );
    expect(next.phase).toBe("playing");
    expect(next.turnPhase).toBe("discard");
    expect(next.hands.p1).toHaveLength(1); // must still discard the last card
  });
});

import { doTakeActiveCard } from "../game/conquian";

// Card + "playing" state builders mirror conquian.actions.test.js.
const c = (rank, suit) => ({ rank, suit, id: `${rank}${suit}` });
const ids = (cards) => cards.map((x) => x.id).sort();

const playing = (over) => ({
  phase: "playing",
  turnPhase: "action",
  players: [{ id: "p1" }, { id: "p2" }],
  currentPlayerIndex: 0,
  melds: { p1: [], p2: [] },
  hands: { p1: [], p2: [] },
  deadPile: [],
  chainPassedPids: [],
  activeCard: null,
  activeCardSourcePid: null,
  winTarget: 11,
  autoTook: null,
  ...over,
});

describe('doTakeActiveCard — "new" meld from hand', () => {
  const setup = () =>
    playing({
      activeCard: c("5", "♠"),
      hands: { p1: [c("6", "♠"), c("7", "♠"), c("K", "♥")], p2: [] },
    });

  test("forms a new run from the active card + hand cards, then must discard", () => {
    const next = doTakeActiveCard(setup(), "p1", {
      type: "new",
      handCardIds: ["6♠", "7♠"],
    });
    expect(next.melds.p1).toHaveLength(1);
    expect(ids(next.melds.p1[0])).toEqual(ids([c("5", "♠"), c("6", "♠"), c("7", "♠")]));
    expect(next.activeCard).toBeNull();
    expect(next.turnPhase).toBe("discard");
  });

  test("removes only the used hand cards", () => {
    const next = doTakeActiveCard(setup(), "p1", {
      type: "new",
      handCardIds: ["6♠", "7♠"],
    });
    expect(ids(next.hands.p1)).toEqual(["K♥"]);
  });

  test("rejects when a referenced hand card is not held", () => {
    const s = setup();
    expect(
      doTakeActiveCard(s, "p1", { type: "new", handCardIds: ["6♠", "9♣"] }),
    ).toBe(s);
  });

  test("rejects when the resulting group is not a valid meld", () => {
    const s = setup();
    // 5♠ + K♥ + 7♠ is neither a set nor a run
    expect(
      doTakeActiveCard(s, "p1", { type: "new", handCardIds: ["K♥", "7♠"] }),
    ).toBe(s);
  });
});

describe('doTakeActiveCard — "extend" an existing meld', () => {
  // Conquián 7→J is consecutive, so J♠ extends a 5-6-7♠ run.
  const setup = () =>
    playing({
      activeCard: c("J", "♠"),
      melds: { p1: [[c("5", "♠"), c("6", "♠"), c("7", "♠")]], p2: [] },
      hands: { p1: [c("K", "♥")], p2: [] },
    });

  test("extends the targeted run and clears the active card", () => {
    const next = doTakeActiveCard(setup(), "p1", { type: "extend", meldIdx: 0 });
    expect(ids(next.melds.p1[0])).toEqual(
      ids([c("5", "♠"), c("6", "♠"), c("7", "♠"), c("J", "♠")]),
    );
    expect(next.activeCard).toBeNull();
    expect(next.turnPhase).toBe("discard");
  });

  test("rejects a meldIdx that doesn't exist", () => {
    const s = setup();
    expect(doTakeActiveCard(s, "p1", { type: "extend", meldIdx: 3 })).toBe(s);
  });

  test("rejects a card that can't extend the target meld", () => {
    const s = playing({
      activeCard: c("K", "♥"), // doesn't extend a 5-6-7♠ run
      melds: { p1: [[c("5", "♠"), c("6", "♠"), c("7", "♠")]], p2: [] },
    });
    expect(doTakeActiveCard(s, "p1", { type: "extend", meldIdx: 0 })).toBe(s);
  });
});

describe("doTakeActiveCard — guards", () => {
  const base = () =>
    playing({
      activeCard: c("5", "♠"),
      hands: { p1: [c("6", "♠"), c("7", "♠")], p2: [] },
    });

  test("rejects an unknown meld-action type", () => {
    const s = base();
    expect(doTakeActiveCard(s, "p1", { type: "bogus" })).toBe(s);
  });

  test("rejects when it is not the player's turn", () => {
    const s = base();
    expect(
      doTakeActiveCard(s, "p2", { type: "new", handCardIds: [] }),
    ).toBe(s);
  });

  test("rejects when there is no active card", () => {
    const s = playing({ activeCard: null });
    expect(
      doTakeActiveCard(s, "p1", { type: "new", handCardIds: [] }),
    ).toBe(s);
  });
});

describe("doTakeActiveCard — winning take", () => {
  test("reaching the win target ends the game (no discard needed)", () => {
    const s = playing({
      winTarget: 3,
      activeCard: c("5", "♠"),
      hands: { p1: [c("6", "♠"), c("7", "♠")], p2: [] },
    });
    const next = doTakeActiveCard(s, "p1", {
      type: "new",
      handCardIds: ["6♠", "7♠"],
    });
    expect(next.phase).toBe("results");
    expect(next.winner.id).toBe("p1");
    expect(next.tie).toBe(false);
  });
});

import {
  createDeck,
  dealHands,
  isPlayable,
  checkWin,
  getNextPlayer,
  removePlayer,
} from "../game/lastCard";

const num = (color, value) => ({ color, type: "number", value });
const action = (color, type) => ({ color, type, value: null });
const WILD = { color: null, type: "wild", value: null };
const WILD4 = { color: null, type: "wild_draw4", value: null };

describe("createDeck", () => {
  test("is a 108-card deck", () => {
    expect(createDeck()).toHaveLength(108);
  });

  test("has 8 wild cards (4 wild + 4 wild draw four), all colorless", () => {
    const wilds = createDeck().filter(
      (card) => card.type === "wild" || card.type === "wild_draw4",
    );
    expect(wilds).toHaveLength(8);
    expect(wilds.every((card) => card.color === null)).toBe(true);
  });

  test("has exactly one zero per color", () => {
    const zeros = createDeck().filter(
      (card) => card.type === "number" && card.value === 0,
    );
    expect(zeros).toHaveLength(4);
  });
});

describe("dealHands", () => {
  test("deals the right hand sizes and leaves the rest in the deck", () => {
    const deck = Array.from({ length: 20 }, (_, id) => ({ id }));
    const { hands, remainingDeck } = dealHands(deck, 3, 5);
    expect(Object.keys(hands)).toEqual(["0", "1", "2"]);
    expect(hands["0"]).toHaveLength(5);
    expect(hands["2"]).toHaveLength(5);
    expect(remainingDeck).toHaveLength(5);
  });

  test("does not mutate the source deck", () => {
    const deck = Array.from({ length: 20 }, (_, id) => ({ id }));
    dealHands(deck, 3, 5);
    expect(deck).toHaveLength(20);
  });
});

describe("isPlayable", () => {
  test("a wild is always playable", () => {
    expect(isPlayable(WILD, num("crimson", 5), "crimson")).toBe(true);
  });

  test("wild draw four is only playable with no matching color in hand", () => {
    expect(isPlayable(WILD4, num("crimson", 5), "crimson", false)).toBe(true);
    expect(isPlayable(WILD4, num("crimson", 5), "crimson", true)).toBe(false);
  });

  test("a card matching the active color is playable", () => {
    expect(
      isPlayable(num("turquoise", 3), num("crimson", 9), "turquoise"),
    ).toBe(true);
  });

  test("a number matching the top value (different color) is playable", () => {
    expect(isPlayable(num("turquoise", 5), num("crimson", 5), "crimson")).toBe(
      true,
    );
  });

  test("a number that matches neither color nor value is not playable", () => {
    expect(isPlayable(num("turquoise", 5), num("crimson", 9), "crimson")).toBe(
      false,
    );
  });

  test("an action card matching the top action type is playable", () => {
    expect(
      isPlayable(
        action("turquoise", "skip"),
        action("crimson", "skip"),
        "crimson",
      ),
    ).toBe(true);
  });

  test("an action card matching the active color is playable", () => {
    expect(
      isPlayable(action("turquoise", "skip"), num("crimson", 9), "turquoise"),
    ).toBe(true);
  });

  test("a different action type with no color match is not playable", () => {
    expect(
      isPlayable(
        action("turquoise", "skip"),
        action("crimson", "reverse"),
        "crimson",
      ),
    ).toBe(false);
  });

  test("draw2 plays on draw2", () => {
    expect(
      isPlayable(
        action("turquoise", "draw2"),
        action("crimson", "draw2"),
        "crimson",
      ),
    ).toBe(true);
  });

  test("a missing card or top card is not playable", () => {
    expect(isPlayable(null, num("crimson", 5), "crimson")).toBe(false);
    expect(isPlayable(num("crimson", 5), null, "crimson")).toBe(false);
  });
});

describe("checkWin", () => {
  test("returns the id of a player who has emptied their hand", () => {
    const state = { hands: { 0: [num("crimson", 5)], 1: [] } };
    expect(checkWin(state)).toBe("1");
  });

  test("returns null while everyone still holds cards", () => {
    const state = { hands: { 0: [num("crimson", 5)], 1: [WILD] } };
    expect(checkWin(state)).toBeNull();
  });
});

describe("getNextPlayer", () => {
  const players = [{ id: 0 }, { id: 1 }, { id: 2 }];

  test("advances forward in normal direction", () => {
    expect(getNextPlayer({ players, currentTurn: 0, turnDirection: 1 })).toBe(
      "1",
    );
  });

  test("wraps around the end of the player list", () => {
    expect(getNextPlayer({ players, currentTurn: 2, turnDirection: 1 })).toBe(
      "0",
    );
  });

  test("goes backward when the direction is reversed", () => {
    expect(getNextPlayer({ players, currentTurn: 0, turnDirection: -1 })).toBe(
      "2",
    );
  });
});

describe("removePlayer", () => {
  // A 4-player game so removal leaves a playable 3-player game.
  const baseState = () => ({
    players: [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }],
    hands: {
      0: [num("crimson", 5)],
      1: [num("od_green", 2), WILD],
      2: [num("turquoise", 9)],
      3: [num("coral", 1)],
    },
    currentTurn: "0",
    turnDirection: 1,
    activeColor: "crimson",
    pendingDraw: 0,
    pendingAction: null,
    awaitingColorChoiceBy: null,
    pendingWildCard: null,
  });

  test("drops the player and their hand", () => {
    const s = removePlayer(baseState(), "1");
    expect(s.players.map((p) => String(p.id))).toEqual(["0", "2", "3"]);
    expect(s.hands["1"]).toBeUndefined();
    expect(s.hands["0"]).toBeDefined();
  });

  test("keeps the current turn when a non-current player leaves", () => {
    const s = removePlayer(baseState(), "2");
    expect(s.currentTurn).toBe("0"); // player 0 was and still is up
  });

  test("advances the turn to the next remaining player when the leaver is up", () => {
    const s = removePlayer({ ...baseState(), currentTurn: "1" }, "1");
    expect(s.currentTurn).toBe("2"); // turn moves off the leaver
    expect(s.players.map((p) => String(p.id))).toEqual(["0", "2", "3"]);
  });

  test("clears a pending colour choice the leaver owed", () => {
    const s = removePlayer(
      {
        ...baseState(),
        currentTurn: "1",
        awaitingColorChoiceBy: "1",
        pendingWildCard: WILD,
      },
      "1",
    );
    expect(s.awaitingColorChoiceBy).toBeNull();
    expect(s.pendingWildCard).toBeNull();
    expect(s.currentTurn).toBe("2");
  });

  test("returns the state unchanged if the player isn't in the game", () => {
    const state = baseState();
    expect(removePlayer(state, "9")).toBe(state);
  });

  test("won't drop below 2 players (caller must end the game instead)", () => {
    const twoPlayer = {
      ...baseState(),
      players: [{ id: 0 }, { id: 1 }],
    };
    expect(removePlayer(twoPlayer, "1")).toBe(twoPlayer);
  });
});

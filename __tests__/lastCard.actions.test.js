import { applyCard, drawCard } from "../game/lastCard";

const num = (id, color, value) => ({ id, color, type: "number", value });
const action = (id, color, type) => ({ id, color, type, value: null });
const wild = (id) => ({ id, color: null, type: "wild", value: null });

// A minimal Last Card state. Player "0" is to move; top of discard is a
// crimson 3 and the active color is crimson.
function baseState(overrides = {}) {
  return {
    players: [{ id: 0 }, { id: 1 }, { id: 2 }],
    hands: { 0: [], 1: [num("x", "turquoise", 9)], 2: [] },
    discardPile: [num("top", "crimson", 3)],
    drawPile: [],
    activeColor: "crimson",
    turnDirection: 1,
    currentTurn: "0",
    pendingDraw: 0,
    ...overrides,
  };
}

describe("applyCard", () => {
  test("playing a number card moves it to the discard and advances the turn", () => {
    const card = num("c1", "crimson", 5);
    const state = baseState({ hands: { 0: [card], 1: [], 2: [] } });
    const next = applyCard(state, 0, card);

    expect(next.hands["0"]).toHaveLength(0);
    expect(next.discardPile[next.discardPile.length - 1].id).toBe("c1");
    expect(next.activeColor).toBe("crimson");
    expect(next.currentTurn).toBe("1");
    expect(next.pendingDraw).toBe(0);
  });

  test("a card not in the player's hand is a no-op", () => {
    const state = baseState({
      hands: { 0: [num("c1", "crimson", 5)], 1: [], 2: [] },
    });
    const next = applyCard(state, 0, num("ghost", "crimson", 5));
    expect(next).toBe(state);
  });

  test("an unplayable card is a no-op", () => {
    const card = num("c1", "turquoise", 9); // wrong color, wrong value vs crimson 3
    const state = baseState({ hands: { 0: [card], 1: [], 2: [] } });
    expect(applyCard(state, 0, card)).toBe(state);
  });

  test("a wild without a chosen color waits for the color choice (no turn change)", () => {
    const card = wild("w1");
    const state = baseState({ hands: { 0: [card], 1: [], 2: [] } });
    const next = applyCard(state, 0, card);

    expect(next.awaitingColorChoiceBy).toBe("0");
    expect(next.currentTurn).toBe("0");
    expect(next.pendingWildCard.id).toBe("w1");
  });

  test("a skip card skips the next player", () => {
    const card = action("s1", "crimson", "skip");
    const state = baseState({ hands: { 0: [card], 1: [], 2: [] } });
    const next = applyCard(state, 0, card);

    expect(next.currentTurn).toBe("2"); // player 1 is skipped
    expect(next.skippedPlayer).toBe("1");
  });

  test("a draw2 card sets a pending draw of 2 for the next player", () => {
    const card = action("d1", "crimson", "draw2");
    const state = baseState({ hands: { 0: [card], 1: [], 2: [] } });
    const next = applyCard(state, 0, card);

    expect(next.currentTurn).toBe("1");
    expect(next.pendingDraw).toBe(2);
    expect(next.pendingAction).toBe("draw2");
  });

  test("a reverse with two players bounces the turn back to the player", () => {
    const card = action("r1", "crimson", "reverse");
    const state = baseState({
      players: [{ id: 0 }, { id: 1 }],
      hands: { 0: [card], 1: [] },
    });
    const next = applyCard(state, 0, card);

    expect(next.turnDirection).toBe(-1);
    expect(next.currentTurn).toBe("0");
    expect(next.skippedPlayer).toBe("1");
  });
});

describe("drawCard", () => {
  test("moves the top of the draw pile into the player's hand", () => {
    const a = num("a", "crimson", 1);
    const b = num("b", "turquoise", 2);
    const state = baseState({
      drawPile: [a, b],
      hands: { 0: [], 1: [], 2: [] },
    });
    const { state: next, drawnCard } = drawCard(state, 0);

    expect(drawnCard.id).toBe("a");
    expect(next.hands["0"]).toHaveLength(1);
    expect(next.hands["0"][0].id).toBe("a");
    expect(next.drawPile).toHaveLength(1);
    expect(next.drawPile[0].id).toBe("b");
  });
});

import { createRummyState, rummyReducer } from "../game/rummy";

const newGame = () =>
  createRummyState({
    variantId: "ginRummy",
    players: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
  });

describe("createRummyState", () => {
  test("starts in the draw phase with two dealt hands and a discard", () => {
    const state = newGame();
    expect(state.phase).toBe("draw");
    expect(state.currentPlayerIndex).toBe(0);
    expect(Array.isArray(state.hands)).toBe(true);
    expect(state.hands).toHaveLength(2);
    expect(state.hands[0]).toHaveLength(state.handSize);
    expect(state.hands[1]).toHaveLength(state.handSize);
    expect(state.discardPile).toHaveLength(1);
    expect(state.scores).toEqual([0, 0]);
    expect(state.winner).toBeNull();
  });
});

describe("rummyReducer — draw-card", () => {
  test("drawing from the stock grows the hand and moves to the discard phase", () => {
    const state = newGame();
    const before = state.hands[0].length;
    const next = rummyReducer(state, { type: "draw-card", pid: 0 });

    expect(next.phase).toBe("discard");
    expect(next.hands[0]).toHaveLength(before + state.drawCount);
  });

  test("draw is ignored when it's not the draw phase", () => {
    const drawn = rummyReducer(newGame(), { type: "draw-card", pid: 0 });
    const afterSize = drawn.hands[0].length;
    const again = rummyReducer(drawn, { type: "draw-card", pid: 0 });
    expect(again.phase).toBe("discard");
    expect(again.hands[0]).toHaveLength(afterSize); // no second draw
  });

  test("an action from the wrong player is ignored", () => {
    const state = newGame();
    const before = state.hands[0].length;
    const next = rummyReducer(state, { type: "draw-card", pid: 1 }); // not their turn
    expect(next.phase).toBe("draw");
    expect(next.hands[0]).toHaveLength(before);
  });
});

describe("rummyReducer — guards", () => {
  test("a finished game is returned untouched", () => {
    const finished = { winner: { id: "a" }, players: [], hands: [] };
    expect(rummyReducer(finished, { type: "draw-card" })).toBe(finished);
  });
});

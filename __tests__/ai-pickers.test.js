import { getAIMove, COLORS } from "../game/lastCard";
import {
  createRummyState,
  rummyReducer,
  rummyAiChooseMove,
} from "../game/rummy";

// ── Last Card: getAIMove ──────────────────────────────────────────────────────
const num = (id, color, value) => ({ id, color, type: "number", value });
const action = (id, color, type) => ({ id, color, type, value: null });
const WILD = { id: "w", color: null, type: "wild", value: null };

function lcState({ hand, opponentHand, activeColor = "crimson" }) {
  return {
    players: [{ id: 0 }, { id: 1 }],
    hands: { 0: hand, 1: opponentHand },
    discardPile: [num("top", "crimson", 3)],
    activeColor,
  };
}

describe("getAIMove (Last Card)", () => {
  test("returns null when the AI has no legal card", () => {
    const state = lcState({
      hand: [num("a", "turquoise", 9)], // wrong color + wrong value vs crimson 3
      opponentHand: [1, 2, 3, 4, 5],
    });
    expect(getAIMove(state, 0)).toBeNull();
  });

  test("plays a color-matching number when opponents aren't low", () => {
    const state = lcState({
      hand: [num("c5", "crimson", 5)],
      opponentHand: [1, 2, 3, 4, 5], // 5 cards -> no aggressive plays
    });
    const move = getAIMove(state, 0);
    expect(move.card.id).toBe("c5");
    expect(move.chosenColor).toBeNull();
  });

  test("prefers an aggressive draw2 when an opponent is low on cards", () => {
    const state = lcState({
      hand: [num("c5", "crimson", 5), action("d2", "crimson", "draw2")],
      opponentHand: [1, 2], // 2 cards
    });
    expect(getAIMove(state, 0).card.type).toBe("draw2");
  });

  test("supplies a chosen color when it plays a wild", () => {
    const state = lcState({ hand: [WILD], opponentHand: [1, 2, 3] });
    const move = getAIMove(state, 0);
    expect(move.card.type).toBe("wild");
    expect(COLORS).toContain(move.chosenColor);
  });
});

// ── Rummy: rummyAiChooseMove ──────────────────────────────────────────────────
describe("rummyAiChooseMove", () => {
  const newGame = () =>
    createRummyState({
      variantId: "ginRummy",
      players: [
        { id: "a", name: "A", isAI: true },
        { id: "b", name: "B" },
      ],
    });

  test("draws in the draw phase", () => {
    const move = rummyAiChooseMove(newGame(), 0);
    expect(move.type).toBe("draw-card");
  });

  test("chooses a discard-phase action after drawing", () => {
    const afterDraw = rummyReducer(newGame(), { type: "draw-card", pid: 0 });
    const move = rummyAiChooseMove(afterDraw, 0);
    expect(["lay-meld", "discard-card", "knock"]).toContain(move.type);
  });

  test("defaults to draw-card on a malformed state", () => {
    expect(rummyAiChooseMove({}, 0).type).toBe("draw-card");
  });
});

import { canRummyPlayerKnock } from "../game/rummy";

// `canRummyPlayerKnock` gates the in-game Knock button. It delegates to the
// reducer's own `canPlayerFinish`, so the UI and the rules can't drift apart.
//
// These tests deliberately use NO laid melds: with an empty meld list the
// player's deadwood is exactly the sum of their hand, which keeps the cases
// independent of the (nested) internal meld shape. Deadwood values: A=1,
// 2–10 = face value, J/Q/K = 10, jokers = 0.

const c = (rank, suit) => ({ rank, suit });

// pid 0, no melds laid, single player — deadwood == hand sum.
const stateWith = (variantId, hand) => ({
  variantId,
  hands: [hand],
  melds: [],
  players: [{ id: "p0", name: "P0" }],
});

describe("canRummyPlayerKnock — Gin Rummy (knock limit 10)", () => {
  test("deadwood exactly at the limit (10) can knock", () => {
    // A+2+3+4 = 10
    const hand = [c("A", "♠"), c("2", "♥"), c("3", "♦"), c("4", "♣")];
    expect(canRummyPlayerKnock(stateWith("ginRummy", hand), 0)).toBe(true);
  });

  test("deadwood one over the limit (11) cannot knock", () => {
    // A+2+3+5 = 11
    const hand = [c("A", "♠"), c("2", "♥"), c("3", "♦"), c("5", "♣")];
    expect(canRummyPlayerKnock(stateWith("ginRummy", hand), 0)).toBe(false);
  });

  test("a joker adds no deadwood", () => {
    // A+2+3+4 = 10, joker free -> still at the limit
    const hand = [
      c("A", "♠"),
      c("2", "♥"),
      c("3", "♦"),
      c("4", "♣"),
      { rank: "JOKER", suit: "★" },
    ];
    expect(canRummyPlayerKnock(stateWith("ginRummy", hand), 0)).toBe(true);
  });
});

describe("canRummyPlayerKnock — variant routing", () => {
  // 5 + K = 15: over Gin's limit (10), under Rummy 500's (20).
  const hand = [c("5", "♠"), c("K", "♥")];

  test("same hand: Gin cannot knock at 15 deadwood", () => {
    expect(canRummyPlayerKnock(stateWith("ginRummy", hand), 0)).toBe(false);
  });

  test("same hand: Rummy 500 (limit 20) can knock at 15 deadwood", () => {
    expect(canRummyPlayerKnock(stateWith("rummy500", hand), 0)).toBe(true);
  });

  test("Indian Rummy needs real runs, not just low deadwood — empty melds can't knock", () => {
    // Even with 0 deadwood, Indian Rummy requires >=2 runs incl. a pure run.
    expect(canRummyPlayerKnock(stateWith("indianRummy", []), 0)).toBe(false);
  });

  test("unknown variant falls back to Gin Rummy rules", () => {
    expect(canRummyPlayerKnock(stateWith("not-a-variant", hand), 0)).toBe(
      false, // 15 > Gin's 10
    );
  });
});

describe("canRummyPlayerKnock — robustness", () => {
  test("never throws on null/garbage state; returns a boolean", () => {
    expect(typeof canRummyPlayerKnock(null, 0)).toBe("boolean");
    expect(typeof canRummyPlayerKnock(undefined, 0)).toBe("boolean");
    expect(typeof canRummyPlayerKnock({}, 0)).toBe("boolean");
    expect(typeof canRummyPlayerKnock({ hands: [] }, 5)).toBe("boolean");
  });
});

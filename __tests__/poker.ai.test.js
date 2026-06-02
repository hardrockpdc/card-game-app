import { chooseFiveCardDrawDiscards, getPokerHandLabel } from "../game/poker";

const c = (value, suit) => ({ value, suit });

describe("chooseFiveCardDrawDiscards", () => {
  test("keeps a pair and discards the other three (easy)", () => {
    const hand = [
      c(9, "spades"),
      c(9, "hearts"), // pair at indexes 0,1
      c(4, "diamonds"),
      c(7, "clubs"),
      c(2, "spades"),
    ];
    const discards = chooseFiveCardDrawDiscards(hand, "easy");
    expect([...discards].sort((a, b) => a - b)).toEqual([2, 3, 4]);
  });

  test("a pair is never thrown away", () => {
    const hand = [c(5, "s"), c(9, "h"), c(9, "d"), c(7, "c"), c(2, "s")];
    const discards = chooseFiveCardDrawDiscards(hand, "easy");
    expect(discards).not.toContain(1); // the 9s at 1,2 are kept
    expect(discards).not.toContain(2);
  });

  test("with no pair on hard, keeps the 4 highest and discards the lowest", () => {
    const hand = [
      c(14, "spades"),
      c(13, "hearts"),
      c(7, "diamonds"),
      c(4, "clubs"),
      c(2, "spades"),
    ];
    expect(chooseFiveCardDrawDiscards(hand, "hard")).toEqual([4]); // drop the 2
  });
});

describe("getPokerHandLabel", () => {
  test("returns the hand name", () => {
    expect(getPokerHandLabel({ name: "Flush" })).toBe("Flush");
  });

  test("handles a missing result", () => {
    expect(getPokerHandLabel(null)).toBe("No hand");
  });

  test("handles a result with no name", () => {
    expect(getPokerHandLabel({})).toBe("Unknown hand");
  });
});

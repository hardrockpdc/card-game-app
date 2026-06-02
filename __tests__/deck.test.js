import { createDeck, shuffleDeck, calculateHandValue } from "../game/deck";

// Helper: build a hand from rank strings. calculateHandValue only reads `rank`,
// but we include a suit so the cards are shaped like real deck cards.
const hand = (...ranks) => ranks.map((rank) => ({ rank, suit: "♠" }));

describe("createDeck", () => {
  test("produces exactly 52 cards", () => {
    expect(createDeck()).toHaveLength(52);
  });

  test("every card id is unique", () => {
    const ids = createDeck().map((c) => c.id);
    expect(new Set(ids).size).toBe(52);
  });

  test("each card has a rank, suit, and id", () => {
    for (const card of createDeck()) {
      expect(card).toHaveProperty("rank");
      expect(card).toHaveProperty("suit");
      expect(card.id).toBe(card.rank + card.suit);
    }
  });

  test("contains all four Aces", () => {
    const aces = createDeck().filter((c) => c.rank === "A");
    expect(aces).toHaveLength(4);
  });
});

describe("shuffleDeck", () => {
  test("does not mutate the original deck", () => {
    const original = createDeck();
    const snapshot = original.map((c) => c.id);
    shuffleDeck(original);
    expect(original.map((c) => c.id)).toEqual(snapshot);
  });

  test("keeps the same 52 cards (same multiset of ids)", () => {
    const original = createDeck();
    const shuffled = shuffleDeck(original);
    expect(shuffled).toHaveLength(52);
    expect([...shuffled].map((c) => c.id).sort()).toEqual(
      [...original].map((c) => c.id).sort(),
    );
  });
});

describe("calculateHandValue", () => {
  test("sums simple number cards", () => {
    expect(calculateHandValue(hand("2", "3", "4"))).toBe(9);
  });

  test("counts face cards as 10", () => {
    expect(calculateHandValue(hand("K", "Q"))).toBe(20);
    expect(calculateHandValue(hand("J", "5"))).toBe(15);
  });

  test("Ace + ten-value card is a blackjack (21)", () => {
    expect(calculateHandValue(hand("A", "K"))).toBe(21);
    expect(calculateHandValue(hand("A", "10"))).toBe(21);
  });

  test("Ace counts as 11 when it does not bust (soft hand)", () => {
    expect(calculateHandValue(hand("A", "6"))).toBe(17);
  });

  test("Ace demotes from 11 to 1 to avoid busting", () => {
    // A(11) + 6 + 10 would be 27 -> demote ace -> 17
    expect(calculateHandValue(hand("A", "6", "10"))).toBe(17);
  });

  test("two Aces = 12 (one counts 11, one counts 1)", () => {
    expect(calculateHandValue(hand("A", "A"))).toBe(12);
  });

  test("three Aces = 13", () => {
    expect(calculateHandValue(hand("A", "A", "A"))).toBe(13);
  });

  test("A + A + 9 = 21 (only one Ace stays at 11)", () => {
    expect(calculateHandValue(hand("A", "A", "9"))).toBe(21);
  });

  test("a genuine bust stays over 21 when no Ace can save it", () => {
    expect(calculateHandValue(hand("K", "Q", "5"))).toBe(25);
  });

  test("empty hand is 0", () => {
    expect(calculateHandValue([])).toBe(0);
  });
});

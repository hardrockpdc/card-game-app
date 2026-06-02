import {
  evaluatePokerVariantHand,
  dealPokerVariantHands,
  drawReplacementCards,
  createStandardDeck,
} from "../game/poker";

// evaluateFiveCardHand reads card.value (number) and card.suit.
const c = (value, suit) => ({ value, suit });

describe("evaluatePokerVariantHand — Texas Hold'em", () => {
  test("finds the best 5 of (2 hole + 5 community) — a royal flush", () => {
    const r = evaluatePokerVariantHand({
      variant: "texasHoldem",
      holeCards: [c(14, "spades"), c(13, "spades")],
      communityCards: [
        c(12, "spades"),
        c(11, "spades"),
        c(10, "spades"),
        c(2, "hearts"),
        c(3, "diamonds"),
      ],
    });
    expect(r.category).toBe(8);
    expect(r.score).toEqual([8, 14]);
  });
});

describe("evaluatePokerVariantHand — Omaha (must use exactly 2 hole + 3 board)", () => {
  test("combines 2 hole aces with 2 board aces into four of a kind", () => {
    const r = evaluatePokerVariantHand({
      variant: "omaha",
      holeCards: [
        c(14, "spades"),
        c(14, "hearts"),
        c(7, "diamonds"),
        c(2, "clubs"),
      ],
      communityCards: [
        c(14, "diamonds"),
        c(14, "clubs"),
        c(13, "spades"),
        c(12, "spades"),
        c(11, "spades"),
      ],
    });
    expect(r.category).toBe(7); // four aces
  });

  test("cannot make a flush when the board has fewer than 3 of the suit", () => {
    // 4 hearts in hand but only 2 hearts on the board -> no Omaha flush,
    // even though a naive 7-card read of these cards would flush.
    const r = evaluatePokerVariantHand({
      variant: "omaha",
      holeCards: [
        c(14, "hearts"),
        c(13, "hearts"),
        c(12, "hearts"),
        c(11, "hearts"),
      ],
      communityCards: [
        c(10, "hearts"),
        c(9, "hearts"),
        c(2, "spades"),
        c(3, "diamonds"),
        c(4, "clubs"),
      ],
    });
    expect(r.category).toBeLessThan(5); // not a flush / straight flush
  });

  test("returns null when there aren't enough cards", () => {
    expect(
      evaluatePokerVariantHand({
        variant: "omaha",
        holeCards: [c(14, "spades"), c(13, "spades"), c(12, "spades")], // only 3
        communityCards: [c(2, "h"), c(3, "h"), c(4, "h"), c(5, "h"), c(6, "h")],
      }),
    ).toBeNull();
  });
});

describe("evaluatePokerVariantHand — Five Card Draw", () => {
  test("evaluates the 5 hole cards directly", () => {
    const r = evaluatePokerVariantHand({
      variant: "fiveCardDraw",
      holeCards: [
        c(9, "spades"),
        c(9, "hearts"),
        c(4, "diamonds"),
        c(7, "clubs"),
        c(2, "spades"),
      ],
      communityCards: [],
    });
    expect(r.category).toBe(1); // one pair (nines)
  });
});

describe("dealPokerVariantHands", () => {
  test("Texas Hold'em deals 2 per player + 5 community and shrinks the deck", () => {
    const { players, communityCards, deck } = dealPokerVariantHands({
      variant: "texasHoldem",
      players: [{ id: "a" }, { id: "b" }, { id: "c" }],
      deck: createStandardDeck(),
    });
    expect(players.every((p) => p.cards.length === 2)).toBe(true);
    expect(communityCards).toHaveLength(5);
    expect(deck).toHaveLength(52 - 3 * 2 - 5);
  });

  test("Omaha deals 4 per player; no card is dealt twice", () => {
    const { players, communityCards, deck } = dealPokerVariantHands({
      variant: "omaha",
      players: [{ id: "a" }, { id: "b" }],
      deck: createStandardDeck(),
    });
    expect(players.every((p) => p.cards.length === 4)).toBe(true);
    expect(communityCards).toHaveLength(5);
    const allIds = [
      ...players.flatMap((p) => p.cards.map((card) => card.id)),
      ...communityCards.map((card) => card.id),
      ...deck.map((card) => card.id),
    ];
    expect(new Set(allIds).size).toBe(52);
  });
});

describe("drawReplacementCards", () => {
  test("discards the chosen indexes and refills from the deck", () => {
    const hand = [c(2, "s"), c(3, "s"), c(4, "s"), c(5, "s"), c(6, "s")];
    const deck = [c(10, "h"), c(11, "h"), c(12, "h")];
    const result = drawReplacementCards(hand, [0, 2], deck);
    expect(result.hand).toHaveLength(5); // kept 3 + drew 2
    expect(result.deck).toHaveLength(1); // drew 2 of 3
  });
});

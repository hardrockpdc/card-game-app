// The Poker screen deals from game/deck.js, whose cards are { rank: "A",
// suit: "♠", id }. game/poker.js evaluates via getCardValue/getCardSuit, which
// are deliberately tolerant of that shape. This file pins that compatibility
// down, because the screen's variant support depends on it — if these two card
// vocabularies ever drift apart, poker scoring breaks silently rather than
// throwing, which is exactly the failure that is hardest to notice.
import { createDeck, SUITS, RANKS } from "../game/deck";
import {
  getCardValue,
  getCardSuit,
  evaluateFiveCardHand,
  evaluatePokerVariantHand,
} from "../game/poker";

const card = (rank, suit) => ({ rank, suit, id: rank + suit });

describe("game/deck cards are readable by game/poker", () => {
  test("every rank in the shared deck maps to a distinct poker value 2..14", () => {
    const values = RANKS.map((rank) => getCardValue(card(rank, "♠")));
    expect(values).toEqual([14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(new Set(values).size).toBe(13);
  });

  test("every suit is read back distinctly, so flushes can be detected", () => {
    const suits = SUITS.map((suit) => getCardSuit(card("A", suit)));
    expect(new Set(suits).size).toBe(4);
  });

  test("a full createDeck() has 52 cards that all read as valid", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    for (const c of deck) {
      expect(getCardValue(c)).toBeGreaterThanOrEqual(2);
      expect(getCardValue(c)).toBeLessThanOrEqual(14);
      expect(getCardSuit(c)).not.toBe("");
    }
  });
});

describe("hands built from game/deck cards score correctly", () => {
  test("royal flush", () => {
    const r = evaluateFiveCardHand([
      card("A", "♠"),
      card("K", "♠"),
      card("Q", "♠"),
      card("J", "♠"),
      card("10", "♠"),
    ]);
    expect(r.category).toBe(8);
  });

  test("a flush is not claimed across mixed suits", () => {
    const r = evaluateFiveCardHand([
      card("A", "♠"),
      card("K", "♠"),
      card("Q", "♠"),
      card("J", "♠"),
      card("10", "♥"),
    ]);
    expect(r.category).toBe(4); // straight, not a flush
  });

  test("the wheel (A-2-3-4-5) is a straight with the ace low", () => {
    const r = evaluateFiveCardHand([
      card("A", "♠"),
      card("2", "♥"),
      card("3", "♦"),
      card("4", "♣"),
      card("5", "♠"),
    ]);
    expect(r.category).toBe(4);
  });

  test("a pair of nines beats ace-high", () => {
    const pair = evaluateFiveCardHand([
      card("9", "♠"),
      card("9", "♥"),
      card("4", "♦"),
      card("7", "♣"),
      card("2", "♠"),
    ]);
    const high = evaluateFiveCardHand([
      card("A", "♠"),
      card("K", "♥"),
      card("8", "♦"),
      card("6", "♣"),
      card("3", "♠"),
    ]);
    expect(pair.category).toBeGreaterThan(high.category);
  });
});

describe("Omaha's two-from-hand rule holds for deck.js cards", () => {
  test("four hearts in hand plus two on the board is NOT a flush", () => {
    const r = evaluatePokerVariantHand({
      variant: "omaha",
      holeCards: [
        card("A", "♥"),
        card("K", "♥"),
        card("Q", "♥"),
        card("J", "♥"),
      ],
      communityCards: [
        card("10", "♥"),
        card("9", "♥"),
        card("2", "♠"),
        card("3", "♦"),
        card("4", "♣"),
      ],
    });
    // A naive best-of-seven read would call this a straight flush.
    expect(r.category).toBeLessThan(5);
  });

  test("two hole aces plus two board aces make four of a kind", () => {
    const r = evaluatePokerVariantHand({
      variant: "omaha",
      holeCards: [
        card("A", "♠"),
        card("A", "♥"),
        card("7", "♦"),
        card("2", "♣"),
      ],
      communityCards: [
        card("A", "♦"),
        card("A", "♣"),
        card("K", "♠"),
        card("Q", "♠"),
        card("J", "♠"),
      ],
    });
    expect(r.category).toBe(7);
  });
});

import {
  evaluateFiveCardHand,
  comparePokerScores,
  getBestFiveCardHand,
} from "../game/poker";

// Build a card from a short code like "As", "Kh", "10d".
// Last char = suit, the rest = rank. Matches what getCardValue/getCardSuit read.
const card = (code) => ({ rank: code.slice(0, -1), suit: code.slice(-1) });
const hand = (...codes) => codes.map(card);

describe("evaluateFiveCardHand — category detection", () => {
  test("royal flush is a straight-flush scoring [8, 14]", () => {
    const r = evaluateFiveCardHand(hand("As", "Ks", "Qs", "Js", "10s"));
    expect(r.category).toBe(8);
    expect(r.name).toBe("Straight Flush");
    expect(r.score).toEqual([8, 14]);
  });

  test("wheel straight flush (A-2-3-4-5) scores high = 5", () => {
    const r = evaluateFiveCardHand(hand("5s", "4s", "3s", "2s", "As"));
    expect(r.category).toBe(8);
    expect(r.score).toEqual([8, 5]);
  });

  test("four of a kind", () => {
    const r = evaluateFiveCardHand(hand("Ks", "Kh", "Kd", "Kc", "3s"));
    expect(r.category).toBe(7);
    expect(r.score).toEqual([7, 13, 3]);
  });

  test("full house scores trips then pair", () => {
    const r = evaluateFiveCardHand(hand("Qs", "Qh", "Qd", "4s", "4h"));
    expect(r.category).toBe(6);
    expect(r.score).toEqual([6, 12, 4]);
  });

  test("flush (not a straight) is category 5", () => {
    const r = evaluateFiveCardHand(hand("As", "Js", "9s", "6s", "3s"));
    expect(r.category).toBe(5);
    expect(r.score).toEqual([5, 14, 11, 9, 6, 3]);
  });

  test("straight with mixed suits is category 4", () => {
    const r = evaluateFiveCardHand(hand("9s", "8h", "7d", "6c", "5s"));
    expect(r.category).toBe(4);
    expect(r.score).toEqual([4, 9]);
  });

  test("wheel straight (A-2-3-4-5) scores high = 5", () => {
    const r = evaluateFiveCardHand(hand("As", "2h", "3d", "4c", "5s"));
    expect(r.category).toBe(4);
    expect(r.score).toEqual([4, 5]);
  });

  test("three of a kind", () => {
    const r = evaluateFiveCardHand(hand("7s", "7h", "7d", "Ks", "2c"));
    expect(r.category).toBe(3);
    expect(r.score).toEqual([3, 7, 13, 2]);
  });

  test("two pair scores high pair, low pair, kicker", () => {
    const r = evaluateFiveCardHand(hand("As", "Ah", "Ks", "Kh", "4c"));
    expect(r.category).toBe(2);
    expect(r.score).toEqual([2, 14, 13, 4]);
  });

  test("one pair", () => {
    const r = evaluateFiveCardHand(hand("10s", "10h", "As", "Kc", "4d"));
    expect(r.category).toBe(1);
    expect(r.score).toEqual([1, 10, 14, 13, 4]);
  });

  test("high card", () => {
    const r = evaluateFiveCardHand(hand("As", "Qh", "9d", "6c", "3s"));
    expect(r.category).toBe(0);
    expect(r.score).toEqual([0, 14, 12, 9, 6, 3]);
  });
});

describe("comparePokerScores — ranking & tiebreaks", () => {
  // Strongest -> weakest, one representative hand per category.
  const ladder = [
    hand("As", "Ks", "Qs", "Js", "10s"), // 8 straight flush
    hand("Ks", "Kh", "Kd", "Kc", "3s"), // 7 quads
    hand("Qs", "Qh", "Qd", "4s", "4h"), // 6 full house
    hand("As", "Js", "9s", "6s", "3s"), // 5 flush
    hand("9s", "8h", "7d", "6c", "5s"), // 4 straight
    hand("7s", "7h", "7d", "Ks", "2c"), // 3 trips
    hand("As", "Ah", "Ks", "Kh", "4c"), // 2 two pair
    hand("10s", "10h", "As", "Kc", "4d"), // 1 pair
    hand("As", "Qh", "9d", "6c", "3s"), // 0 high card
  ].map((h) => evaluateFiveCardHand(h).score);

  test("each category outranks the one below it", () => {
    for (let i = 0; i < ladder.length - 1; i += 1) {
      expect(comparePokerScores(ladder[i], ladder[i + 1])).toBe(1);
      expect(comparePokerScores(ladder[i + 1], ladder[i])).toBe(-1);
    }
  });

  test("pair of Kings beats pair of Queens (kicker-independent)", () => {
    const kings = evaluateFiveCardHand(
      hand("Ks", "Kh", "7d", "5c", "2s"),
    ).score;
    const queens = evaluateFiveCardHand(
      hand("Qs", "Qh", "Ad", "Kc", "Js"),
    ).score;
    expect(comparePokerScores(kings, queens)).toBe(1);
  });

  test("ace-high flush beats king-high flush", () => {
    const aceHigh = evaluateFiveCardHand(
      hand("As", "9s", "6s", "4s", "2s"),
    ).score;
    const kingHigh = evaluateFiveCardHand(
      hand("Ks", "9s", "6s", "4s", "2s"),
    ).score;
    expect(comparePokerScores(aceHigh, kingHigh)).toBe(1);
  });

  test("full house ranks on the trips first (Q-full beats J-full)", () => {
    const qFull = evaluateFiveCardHand(
      hand("Qs", "Qh", "Qd", "2s", "2h"),
    ).score;
    const jFull = evaluateFiveCardHand(
      hand("Js", "Jh", "Jd", "As", "Ah"),
    ).score;
    expect(comparePokerScores(qFull, jFull)).toBe(1);
  });

  test("identical hands of different suits tie", () => {
    const spades = evaluateFiveCardHand(
      hand("As", "Ks", "Qs", "Js", "10s"),
    ).score;
    const hearts = evaluateFiveCardHand(
      hand("Ah", "Kh", "Qh", "Jh", "10h"),
    ).score;
    expect(comparePokerScores(spades, hearts)).toBe(0);
  });
});

describe("getBestFiveCardHand — best 5 of 7", () => {
  test("finds the royal flush hidden in 7 cards", () => {
    const best = getBestFiveCardHand(
      hand("As", "Ks", "Qs", "Js", "10s", "2h", "3d"),
    );
    expect(best.category).toBe(8);
    expect(best.score).toEqual([8, 14]);
  });

  test("finds four of a kind across hole + board", () => {
    const best = getBestFiveCardHand(
      hand("Ks", "Kh", "Kd", "Kc", "As", "4d", "2h"),
    );
    expect(best.category).toBe(7);
  });

  test("prefers a straight over a lower pair in the same 7 cards", () => {
    const best = getBestFiveCardHand(
      hand("5s", "6h", "7d", "8c", "9s", "Ks", "Kh"),
    );
    expect(best.category).toBe(4); // straight, not the pair of kings
    expect(best.score).toEqual([4, 9]);
  });
});

describe("evaluateFiveCardHand — invalid input", () => {
  test("returns null for the wrong number of cards", () => {
    expect(evaluateFiveCardHand(hand("As", "Ks", "Qs", "Js"))).toBeNull();
    expect(
      evaluateFiveCardHand(hand("As", "Ks", "Qs", "Js", "10s", "9s")),
    ).toBeNull();
  });

  test("returns null for non-array input", () => {
    expect(evaluateFiveCardHand(null)).toBeNull();
    expect(evaluateFiveCardHand(undefined)).toBeNull();
  });
});

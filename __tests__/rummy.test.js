import {
  isValidRummyMeld,
  canExtendRummyMeld,
  calculateRummyDeadwood,
} from "../game/rummy";

const c = (rank, suit) => ({ rank, suit });
const JOKER = { rank: "JOKER", suit: "★" };

describe("isValidRummyMeld — sets", () => {
  test("three of the same rank is a set", () => {
    expect(isValidRummyMeld([c("7", "♠"), c("7", "♥"), c("7", "♦")])).toBe(
      true,
    );
  });

  test("a joker can complete a set", () => {
    expect(isValidRummyMeld([c("7", "♠"), c("7", "♥"), JOKER])).toBe(true);
  });

  test("two cards is not a meld", () => {
    expect(isValidRummyMeld([c("7", "♠"), c("7", "♥")])).toBe(false);
  });

  test("three unrelated cards are neither set nor run", () => {
    expect(isValidRummyMeld([c("7", "♠"), c("8", "♥"), c("9", "♦")])).toBe(
      false,
    );
  });
});

describe("isValidRummyMeld — runs", () => {
  test("three consecutive cards of one suit is a run", () => {
    expect(isValidRummyMeld([c("3", "♠"), c("4", "♠"), c("5", "♠")])).toBe(
      true,
    );
  });

  test("a low Ace run (A-2-3) is valid", () => {
    expect(isValidRummyMeld([c("A", "♠"), c("2", "♠"), c("3", "♠")])).toBe(
      true,
    );
  });

  test("a mixed-suit sequence is not a run", () => {
    expect(isValidRummyMeld([c("3", "♠"), c("4", "♠"), c("5", "♥")])).toBe(
      false,
    );
  });

  test("a joker fills a gap in a run", () => {
    expect(isValidRummyMeld([c("3", "♠"), JOKER, c("5", "♠")])).toBe(true);
  });

  test("a non-consecutive same-suit set of cards is not a run", () => {
    expect(isValidRummyMeld([c("2", "♠"), c("4", "♠"), c("6", "♠")])).toBe(
      false,
    );
  });

  test("Ace does not wrap around (Q-K-A is not a run)", () => {
    expect(isValidRummyMeld([c("Q", "♠"), c("K", "♠"), c("A", "♠")])).toBe(
      false,
    );
  });
});

describe("canExtendRummyMeld", () => {
  const run = [c("3", "♠"), c("4", "♠"), c("5", "♠")];

  test("extends a run at the high end", () => {
    expect(canExtendRummyMeld(run, c("6", "♠"))).toBe(true);
  });

  test("extends a run at the low end", () => {
    expect(canExtendRummyMeld(run, c("2", "♠"))).toBe(true);
  });

  test("rejects a card that leaves a gap", () => {
    expect(canExtendRummyMeld(run, c("7", "♠"))).toBe(false);
  });

  test("rejects a wrong-suit card", () => {
    expect(canExtendRummyMeld(run, c("6", "♥"))).toBe(false);
  });

  test("a set can take a fourth matching rank", () => {
    const set = [c("9", "♠"), c("9", "♥"), c("9", "♦")];
    expect(canExtendRummyMeld(set, c("9", "♣"))).toBe(true);
  });
});

describe("calculateRummyDeadwood", () => {
  // melds use the flat { cards } shape that flattenMeldCards reads.
  const meld = (cards) => ({ cards });

  test("sums unmelded cards, face cards capped at 10, Ace = 1", () => {
    const hand = [
      c("3", "♠"),
      c("4", "♠"),
      c("5", "♠"), // melded run -> excluded
      c("K", "♥"), // 10
      c("2", "♦"), // 2
    ];
    const melds = [meld([c("3", "♠"), c("4", "♠"), c("5", "♠")])];
    expect(calculateRummyDeadwood(hand, melds)).toBe(12);
  });

  test("with no melds, every card counts (Ace=1, J/Q/K=10)", () => {
    const hand = [c("K", "♠"), c("J", "♥"), c("A", "♦"), c("5", "♣")];
    expect(calculateRummyDeadwood(hand, [])).toBe(26);
  });

  test("jokers contribute 0 deadwood", () => {
    expect(calculateRummyDeadwood([JOKER, c("8", "♠")], [])).toBe(8);
  });

  test("a fully melded hand (gin) has 0 deadwood", () => {
    const hand = [c("3", "♠"), c("4", "♠"), c("5", "♠")];
    const melds = [meld([c("3", "♠"), c("4", "♠"), c("5", "♠")])];
    expect(calculateRummyDeadwood(hand, melds)).toBe(0);
  });

  test("an empty hand is 0", () => {
    expect(calculateRummyDeadwood([], [])).toBe(0);
  });
});

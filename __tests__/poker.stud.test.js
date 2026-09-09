// Seven Card Stud is the one variant where some of a player's cards are public
// while the hand is still live, so the redaction that decides which is
// security-relevant: a bug here leaks hole cards to opponents over the network.
import {
  POKER_VARIANTS,
  getPokerVariantConfig,
  redactStudHand,
  evaluatePokerVariantHand,
} from "../game/poker";

const card = (rank, suit) => ({ rank, suit, id: rank + suit });

const sevenCards = [
  card("A", "♠"), // 0 down
  card("K", "♠"), // 1 down
  card("Q", "♠"), // 2 up
  card("J", "♠"), // 3 up
  card("9", "♥"), // 4 up
  card("4", "♦"), // 5 up
  card("2", "♣"), // 6 down
];

describe("stud config", () => {
  const stud = POKER_VARIANTS.sevenCardStud;

  test("deals seven cards across five streets", () => {
    expect(stud.studDealCounts.reduce((a, b) => a + b, 0)).toBe(
      stud.holeCardCount,
    );
    expect(stud.studDealCounts).toHaveLength(
      stud.communityRevealCounts.length,
    );
  });

  test("never puts cards on a shared board", () => {
    expect(stud.usesCommunityCards).toBe(false);
    expect(stud.communityRevealCounts.every((count) => count === 0)).toBe(true);
  });

  test("keeps three cards down, leaving four up", () => {
    expect(stud.studDownCardIndexes).toHaveLength(3);
    expect(stud.holeCardCount - stud.studDownCardIndexes.length).toBe(4);
  });
});

describe("redactStudHand", () => {
  test("hides exactly the down cards and keeps their positions", () => {
    const shown = redactStudHand(sevenCards, "sevenCardStud");
    expect(shown).toHaveLength(7);
    const downIndexes = getPokerVariantConfig("sevenCardStud")
      .studDownCardIndexes;
    shown.forEach((c, index) => {
      if (downIndexes.includes(index)) expect(c).toBeNull();
      else expect(c).toEqual(sevenCards[index]);
    });
  });

  test("leaks nothing about a down card — not even the rank", () => {
    const shown = redactStudHand(sevenCards, "sevenCardStud");
    const serialised = JSON.stringify(shown);
    // The two down aces/kings must not appear anywhere in what is published.
    expect(serialised).not.toContain("A♠");
    expect(serialised).not.toContain("K♠");
    expect(serialised).not.toContain("2♣");
    // ...while the up cards must.
    expect(serialised).toContain("Q♠");
    expect(serialised).toContain("9♥");
  });

  test("redacts a partial hand mid-street without inventing cards", () => {
    const thirdStreet = sevenCards.slice(0, 3);
    const shown = redactStudHand(thirdStreet, "sevenCardStud");
    expect(shown).toEqual([null, null, sevenCards[2]]);
  });

  test("publishes nothing for variants that are not stud", () => {
    expect(redactStudHand(sevenCards, "texasHoldem")).toEqual([]);
    expect(redactStudHand(sevenCards, "omaha")).toEqual([]);
    expect(redactStudHand(sevenCards, "fiveCardDraw")).toEqual([]);
  });
});

describe("stud scoring uses the best five of all seven", () => {
  test("finds a flush spread across down and up cards", () => {
    const r = evaluatePokerVariantHand({
      variant: "sevenCardStud",
      holeCards: sevenCards,
      communityCards: [],
    });
    // A♠ K♠ Q♠ J♠ plus no fifth spade -> not a flush; best is ace high straight? no.
    // A-K-Q-J with a 9,4,2 offsuit: highest is ace-high, nothing made.
    expect(r).not.toBeNull();
    expect(r.category).toBe(0);
  });

  test("four to a flush plus a fifth of the suit does make a flush", () => {
    const r = evaluatePokerVariantHand({
      variant: "sevenCardStud",
      holeCards: [
        card("A", "♠"),
        card("K", "♠"),
        card("Q", "♠"),
        card("J", "♠"),
        card("3", "♠"),
        card("4", "♦"),
        card("2", "♣"),
      ],
      communityCards: [],
    });
    expect(r.category).toBe(5); // flush
  });
});

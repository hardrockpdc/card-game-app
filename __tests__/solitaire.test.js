import {
  isCardRed,
  isKlondikeCardMoveLegal,
  isSpiderCardMoveLegal,
  isFreeCellCardMoveLegal,
  isPyramidBoardExposed,
  isTriPeaksBoardExposed,
  getTopCard,
  getPyramidRowLengths,
  getTriPeaksRowLengths,
} from "../game/solitaire";

// rank: 1=Ace .. 13=King. Cards default to face up.
const card = (rank, suit, faceUp = true) => ({ rank, suit, faceUp });

describe("isCardRed", () => {
  test("hearts and diamonds are red", () => {
    expect(isCardRed(card(5, "hearts"))).toBe(true);
    expect(isCardRed(card(5, "diamonds"))).toBe(true);
  });

  test("clubs and spades are not red", () => {
    expect(isCardRed(card(5, "clubs"))).toBe(false);
    expect(isCardRed(card(5, "spades"))).toBe(false);
  });
});

describe("getTopCard", () => {
  test("returns the last card of a pile", () => {
    const pile = [card(2, "hearts"), card(7, "spades")];
    expect(getTopCard(pile)).toEqual(card(7, "spades"));
  });

  test("returns null for an empty pile", () => {
    expect(getTopCard([])).toBeNull();
  });
});

describe("isKlondikeCardMoveLegal — foundation", () => {
  test("an Ace can start an empty foundation", () => {
    // tableau top would reject, so this isolates the foundation path
    expect(
      isKlondikeCardMoveLegal(card(1, "spades"), [], [card(5, "hearts")]),
    ).toBe(true);
  });

  test("the next rank of the same suit stacks on the foundation", () => {
    const foundation = [card(1, "spades")];
    expect(isKlondikeCardMoveLegal(card(2, "spades"), foundation, [])).toBe(
      true,
    );
  });

  test("a wrong-suit or non-sequential card cannot go to the foundation", () => {
    const foundation = [card(1, "spades")];
    const tableau = [card(5, "spades")]; // also rejects (5 != 2+1)
    expect(
      isKlondikeCardMoveLegal(card(2, "hearts"), foundation, tableau),
    ).toBe(false);
  });
});

describe("isKlondikeCardMoveLegal — tableau", () => {
  const blockingFoundation = [card(13, "hearts")]; // forces the tableau path

  test("a red card stacks on the next-higher black card", () => {
    const tableau = [card(7, "spades")];
    expect(
      isKlondikeCardMoveLegal(card(6, "hearts"), blockingFoundation, tableau),
    ).toBe(true);
  });

  test("same-color stacking is illegal", () => {
    const tableau = [card(7, "clubs")];
    expect(
      isKlondikeCardMoveLegal(card(6, "spades"), blockingFoundation, tableau),
    ).toBe(false);
  });

  test("any card may move to an empty tableau pile", () => {
    expect(
      isKlondikeCardMoveLegal(card(5, "hearts"), blockingFoundation, []),
    ).toBe(true);
  });
});

describe("isSpiderCardMoveLegal", () => {
  test("descending order stacks regardless of suit", () => {
    expect(isSpiderCardMoveLegal(card(6, "hearts"), [card(7, "spades")])).toBe(
      true,
    );
    expect(isSpiderCardMoveLegal(card(6, "spades"), [card(7, "spades")])).toBe(
      true,
    );
  });

  test("a non-descending card is illegal", () => {
    expect(isSpiderCardMoveLegal(card(6, "hearts"), [card(8, "spades")])).toBe(
      false,
    );
  });

  test("a face-down top card blocks the move", () => {
    expect(
      isSpiderCardMoveLegal(card(6, "hearts"), [card(7, "spades", false)]),
    ).toBe(false);
  });

  test("any card may move to an empty pile", () => {
    expect(isSpiderCardMoveLegal(card(5, "hearts"), [])).toBe(true);
  });
});

describe("isFreeCellCardMoveLegal", () => {
  test("behaves like Klondike — Ace to empty foundation", () => {
    expect(isFreeCellCardMoveLegal(card(1, "spades"), [], [])).toBe(true);
  });

  test("behaves like Klondike — red on black tableau", () => {
    const foundation = [card(13, "hearts")];
    expect(
      isFreeCellCardMoveLegal(card(6, "hearts"), foundation, [
        card(7, "spades"),
      ]),
    ).toBe(true);
  });
});

describe("pyramid / tripeaks exposure", () => {
  // rows[0] = apex, rows[1] = the two cards beneath it.
  const covered = [[card(1, "spades")], [card(2, "hearts"), card(3, "clubs")]];
  const uncovered = [[card(1, "spades")], [null, null]];

  test("the bottom row is always exposed", () => {
    expect(isPyramidBoardExposed(covered, 1, 0)).toBe(true);
    expect(isTriPeaksBoardExposed(covered, 1, 1)).toBe(true);
  });

  test("an apex with both children present is covered", () => {
    expect(isPyramidBoardExposed(covered, 0, 0)).toBe(false);
    expect(isTriPeaksBoardExposed(covered, 0, 0)).toBe(false);
  });

  test("an apex becomes exposed once both children are removed", () => {
    expect(isPyramidBoardExposed(uncovered, 0, 0)).toBe(true);
    expect(isTriPeaksBoardExposed(uncovered, 0, 0)).toBe(true);
  });

  test("an apex with one child still present stays covered", () => {
    const half = [[card(1, "spades")], [card(2, "hearts"), null]];
    expect(isPyramidBoardExposed(half, 0, 0)).toBe(false);
  });
});

describe("board row-length constants", () => {
  test("pyramid is 1..7", () => {
    expect(getPyramidRowLengths()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test("tripeaks is [3, 6, 9, 10]", () => {
    expect(getTriPeaksRowLengths()).toEqual([3, 6, 9, 10]);
  });
});

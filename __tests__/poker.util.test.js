import { combinationsOfSize, getPokerVariantConfig } from "../game/poker";

describe("combinationsOfSize", () => {
  test("C(5,2) yields 10 unique combinations in index order", () => {
    const combos = combinationsOfSize([1, 2, 3, 4, 5], 2);
    expect(combos).toHaveLength(10); // 5C2
    // every combo has 2 distinct items, kept in ascending index order
    for (const combo of combos) {
      expect(combo).toHaveLength(2);
      expect(combo[0]).toBeLessThan(combo[1]);
    }
    // no duplicate combinations
    const keys = combos.map((c) => c.join(","));
    expect(new Set(keys).size).toBe(10);
  });

  test("C(7,5) = 21 (the best-five-of-seven case)", () => {
    expect(combinationsOfSize([0, 1, 2, 3, 4, 5, 6], 5)).toHaveLength(21);
  });

  test("size 0 returns a single empty combination", () => {
    expect(combinationsOfSize([1, 2, 3], 0)).toEqual([[]]);
  });

  test("size larger than the input returns no combinations", () => {
    expect(combinationsOfSize([1, 2], 3)).toEqual([]);
  });

  test("size equal to the input returns the whole set once", () => {
    expect(combinationsOfSize([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });

  test("size 1 returns each item as a singleton", () => {
    expect(combinationsOfSize(["a", "b", "c"], 1)).toEqual([["a"], ["b"], ["c"]]);
  });

  test("does not mutate the input array", () => {
    const items = [1, 2, 3];
    const snap = [...items];
    combinationsOfSize(items, 2);
    expect(items).toEqual(snap);
  });
});

describe("getPokerVariantConfig", () => {
  test("returns the matching config for a known variant", () => {
    expect(getPokerVariantConfig("omaha").label).toBe("Omaha");
    expect(getPokerVariantConfig("sevenCardStud").label).toBe(
      "Seven Card Stud",
    );
  });

  test("falls back to Texas Hold'em for unknown/undefined variants", () => {
    const fallback = getPokerVariantConfig("texasHoldem");
    expect(getPokerVariantConfig("not-a-variant")).toBe(fallback);
    expect(getPokerVariantConfig(undefined)).toBe(fallback);
    expect(getPokerVariantConfig(null)).toBe(fallback);
  });

  test("distinct variants return distinct configs", () => {
    expect(getPokerVariantConfig("omaha")).not.toBe(
      getPokerVariantConfig("texasHoldem"),
    );
  });
});

import { getRank, getRankProgress, RANKS } from "../game/ranks";

describe("getRank", () => {
  test("Rookie at 0 lifetime", () => {
    const r = getRank(0);
    expect(r.name).toBe("Rookie");
    expect(r.next.name).toBe("Card Shark");
  });

  test("promotes exactly at a threshold", () => {
    expect(getRank(5000).name).toBe("Card Shark");
    expect(getRank(4999).name).toBe("Rookie");
  });

  test("top rank has no next", () => {
    const r = getRank(100000);
    expect(r.name).toBe("Legend");
    expect(r.next).toBeNull();
  });

  test("guards invalid input", () => {
    expect(getRank(-10).name).toBe("Rookie");
    expect(getRank(NaN).name).toBe("Rookie");
  });
});

describe("getRankProgress", () => {
  test("0 at the start of a rank, ~0.5 halfway", () => {
    expect(getRankProgress(0)).toBe(0);
    // Halfway between Rookie(0) and Card Shark(5000)
    expect(getRankProgress(2500)).toBeCloseTo(0.5, 5);
  });

  test("1 at the top rank", () => {
    expect(getRankProgress(200000)).toBe(1);
  });

  test("ranks are sorted ascending", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].threshold).toBeGreaterThan(RANKS[i - 1].threshold);
    }
  });
});

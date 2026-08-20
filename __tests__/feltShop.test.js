import { getFeltPrice, isFeltUnlocked } from "../game/feltShop";
import { LAST_CARD_TABLES } from "../game/lastCardTheme";

describe("feltShop", () => {
  test("the three starter felts are free", () => {
    expect(getFeltPrice("indigo")).toBe(0);
    expect(getFeltPrice("green")).toBe(0);
    expect(getFeltPrice("teal")).toBe(0);
  });

  test("premium felts cost 2000", () => {
    expect(getFeltPrice("crimson")).toBe(2000);
    expect(getFeltPrice("royal")).toBe(2000);
    expect(getFeltPrice("rosegold")).toBe(2000);
  });

  test("unknown id has no price", () => {
    expect(getFeltPrice("nope")).toBe(0);
  });

  test("free felts are always unlocked", () => {
    expect(isFeltUnlocked("green", [], null)).toBe(true);
  });

  test("premium felts need ownership", () => {
    expect(isFeltUnlocked("crimson", [], null)).toBe(false);
    expect(isFeltUnlocked("crimson", ["crimson"], null)).toBe(true);
  });

  test("the active felt is grandfathered even if not owned", () => {
    expect(isFeltUnlocked("crimson", [], "crimson")).toBe(true);
  });

  test("every felt has a full field set", () => {
    for (const t of LAST_CARD_TABLES) {
      for (const key of ["rail", "felt", "feltBorder", "panel", "accent", "text"]) {
        expect(typeof t[key]).toBe("string");
      }
      expect(typeof t.price).toBe("number");
    }
  });
});

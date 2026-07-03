import {
  FRAMES_LIST,
  getFrame,
  getFramePrice,
  isFrameUnlocked,
  getFrameRingStyle,
} from "../game/frames";

describe("frames", () => {
  test("None is free; others cost 1000", () => {
    expect(getFramePrice("none")).toBe(0);
    expect(getFramePrice("gold")).toBe(1000);
    expect(getFramePrice("neon")).toBe(1000);
  });

  test("unknown id falls back to none", () => {
    expect(getFrame("nope").name).toBe("None");
    expect(getFramePrice("nope")).toBe(0);
  });

  test("None is always unlocked; premium needs ownership", () => {
    expect(isFrameUnlocked("none", [], "none")).toBe(true);
    expect(isFrameUnlocked("gold", [], "none")).toBe(false);
    expect(isFrameUnlocked("gold", ["gold"], "none")).toBe(true);
  });

  test("the active frame is grandfathered", () => {
    expect(isFrameUnlocked("gold", [], "gold")).toBe(true);
  });

  test("None yields no ring style; a color frame yields a border", () => {
    expect(getFrameRingStyle("none", 64)).toBeNull();
    const ring = getFrameRingStyle("gold", 64);
    expect(ring.borderColor).toBe("#ffd479");
    expect(ring.borderWidth).toBeGreaterThan(0);
  });

  test("glow frames add a shadow", () => {
    expect(getFrameRingStyle("neon", 64).shadowColor).toBe("#5ad1e6");
    expect(getFrameRingStyle("gold", 64).shadowColor).toBeUndefined();
  });

  test("every frame has a name and numeric price", () => {
    for (const [, f] of FRAMES_LIST) {
      expect(typeof f.name).toBe("string");
      expect(typeof f.price).toBe("number");
    }
  });
});

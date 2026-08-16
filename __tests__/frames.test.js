import {
  FRAMES_LIST,
  getFrame,
  getFramePrice,
  isFrameUnlocked,
  getFrameRingStyle,
  getChipStyle,
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

  test("ring frames yield no chip style; chip frames yield no ring style", () => {
    expect(getChipStyle("gold", 64)).toBeNull();
    expect(getFrameRingStyle("chipRed", 64)).toBeNull();
  });

  test("None yields no chip style", () => {
    expect(getChipStyle("none", 64)).toBeNull();
  });

  test("a chip frame yields a body, 8 rim spots, and no rim text data", () => {
    const chip = getChipStyle("chipRed", 64);
    expect(chip.color).toBe("#e94560");
    expect(chip.spotColor).toBe("#ffffff");
    expect(chip.chipSize).toBeGreaterThan(64);
    expect(chip.spots).toHaveLength(8);
    for (const spot of chip.spots) {
      expect(typeof spot.left).toBe("number");
      expect(typeof spot.top).toBe("number");
      expect(spot.width).toBeGreaterThan(0);
      expect(spot.height).toBeGreaterThan(0);
    }
  });

  test("glow chips add a shadow; non-glow chips don't", () => {
    expect(getChipStyle("chipBlue", 64).shadowColor).toBe(getFrame("chipBlue").color);
    expect(getChipStyle("chipWhite", 64).shadowColor).toBeUndefined();
  });

  test("pulse flag reflects the chip's data", () => {
    expect(getChipStyle("chipPurple", 64).pulse).toBe(true);
    expect(getChipStyle("chipRed", 64).pulse).toBe(false);
  });

  test("chip prices scale with tier, matching the ring price range", () => {
    expect(getFramePrice("chipWhite")).toBe(1000);
    expect(getFramePrice("chipRed")).toBe(1000);
    expect(getFramePrice("chipBlue")).toBe(1500);
    expect(getFramePrice("chipGreen")).toBe(1500);
    expect(getFramePrice("chipBlack")).toBe(2000);
    expect(getFramePrice("chipPurple")).toBe(2500);
  });
});

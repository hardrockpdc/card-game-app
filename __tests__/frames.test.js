import {
  FRAMES_LIST,
  getFrame,
  getFramePrice,
  isFrameUnlocked,
  getFrameRingStyle,
} from "../game/frames";

describe("frames", () => {
  test("None is free; others scale with visual complexity", () => {
    expect(getFramePrice("none")).toBe(0);
    expect(getFramePrice("gold")).toBe(1000);
    expect(getFramePrice("rose")).toBe(1000);
    expect(getFramePrice("emerald")).toBe(1500);
    expect(getFramePrice("ruby")).toBe(1500);
    expect(getFramePrice("neon")).toBe(2000);
    expect(getFramePrice("royal")).toBe(2500);
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

  test("dashed frames set borderStyle", () => {
    expect(getFrameRingStyle("rose", 64).borderStyle).toBe("dashed");
    expect(getFrameRingStyle("gold", 64).borderStyle).toBeUndefined();
  });

  test("double frames include a nested inner ring", () => {
    const ring = getFrameRingStyle("royal", 64);
    expect(ring.innerRing).toBeTruthy();
    expect(ring.innerRing.borderColor).toBe("#7a5fc7");
    expect(getFrameRingStyle("gold", 64).innerRing).toBeUndefined();
  });

  test("pips frames expose a glyph and color", () => {
    const ring = getFrameRingStyle("ruby", 64);
    expect(ring.pipGlyph).toBe("♥");
    expect(ring.pipColor).toBe("#e94560");
    expect(getFrameRingStyle("gold", 64).pipGlyph).toBeUndefined();
  });

  test("pulse flag reflects the frame's data", () => {
    expect(getFrameRingStyle("neon", 64).pulse).toBe(true);
    expect(getFrameRingStyle("royal", 64).pulse).toBe(true);
    expect(getFrameRingStyle("gold", 64).pulse).toBe(false);
  });

  test("every frame has a name and numeric price", () => {
    for (const [, f] of FRAMES_LIST) {
      expect(typeof f.name).toBe("string");
      expect(typeof f.price).toBe("number");
    }
  });
});

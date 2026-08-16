import { shadeColor, buildChipStyle } from "../game/chipStyle";

describe("chipStyle", () => {
  test("shadeColor lightens toward white and darkens toward black", () => {
    expect(shadeColor("#808080", 0.5)).toBe("#c0c0c0");
    expect(shadeColor("#808080", -0.5)).toBe("#404040");
  });

  test("builds a chip with a body, 8 rim spots, and derived tones", () => {
    const chip = buildChipStyle({
      size: 50,
      color: "#b3242b",
      spotColor: "#ffffff",
    });
    expect(chip.color).toBe("#b3242b");
    expect(chip.spotColor).toBe("#ffffff");
    expect(chip.chipSize).toBeGreaterThan(50);
    expect(chip.inlaySize).toBeLessThan(chip.chipSize);
    expect(chip.inlaySize).toBeGreaterThan(50);
    expect(chip.spots).toHaveLength(8);
    expect(chip.bodyGradient).toEqual([
      expect.any(String),
      "#b3242b",
      expect.any(String),
    ]);
    expect(chip.inlayColor).not.toBe(chip.color);
    expect(chip.edgeColor).not.toBe(chip.color);
  });

  test("glow adds a shadow; omitting it doesn't", () => {
    const glowChip = buildChipStyle({
      size: 50,
      color: "#1f5fa8",
      spotColor: "#ffd700",
      glow: true,
    });
    expect(glowChip.shadowColor).toBe("#1f5fa8");

    const flatChip = buildChipStyle({
      size: 50,
      color: "#1f5fa8",
      spotColor: "#ffd700",
    });
    expect(flatChip.shadowColor).toBeUndefined();
  });
});

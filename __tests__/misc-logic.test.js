import { getTableTheme, TABLE_THEMES } from "../game/tableThemes";
import {
  getRummyVariantConfig,
  getRummyVariantLabel,
  getRummyVariantOptions,
} from "../game/rummy";
import { chooseColor } from "../game/lastCard";

describe("getTableTheme", () => {
  test("returns the theme for a known game", () => {
    expect(getTableTheme("rummy")).toEqual({
      table: "#B22222",
      accent: "#FFE4B5",
    });
  });

  test("falls back to the blackjack theme for an unknown game", () => {
    expect(getTableTheme("nope")).toBe(TABLE_THEMES.blackjack);
  });

  test("every known game has a table and accent color", () => {
    for (const theme of Object.values(TABLE_THEMES)) {
      expect(typeof theme.table).toBe("string");
      expect(typeof theme.accent).toBe("string");
    }
  });
});

describe("Rummy variant config", () => {
  test("returns a config with a label and hand size", () => {
    const config = getRummyVariantConfig("ginRummy");
    expect(typeof config.label).toBe("string");
    expect(typeof config.handSize).toBe("number");
  });

  test("falls back to Gin Rummy for an unknown variant", () => {
    expect(getRummyVariantConfig("bogus")).toBe(
      getRummyVariantConfig("ginRummy"),
    );
  });

  test("getRummyVariantLabel matches the config label", () => {
    expect(getRummyVariantLabel("ginRummy")).toBe(
      getRummyVariantConfig("ginRummy").label,
    );
  });

  test("getRummyVariantOptions returns {label, value} entries", () => {
    const options = getRummyVariantOptions();
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) {
      expect(typeof o.label).toBe("string");
      expect(typeof o.value).toBe("string");
    }
  });
});

describe("chooseColor (Last Card)", () => {
  const baseAwaiting = (pendingWildCard) => ({
    players: [{ id: 0 }, { id: 1 }],
    turnDirection: 1,
    currentTurn: "0",
    activeColor: "crimson",
    awaitingColorChoiceBy: "0",
    pendingWildCard,
  });

  test("a regular wild sets the active color and advances the turn", () => {
    const next = chooseColor(baseAwaiting({ type: "wild" }), 0, "turquoise");
    expect(next.activeColor).toBe("turquoise");
    expect(next.currentTurn).toBe("1");
    expect(next.pendingDraw).toBe(0);
    expect(next.awaitingColorChoiceBy).toBeNull();
    expect(next.pendingWildCard).toBeNull();
  });

  test("a wild draw four sets a pending draw of 4", () => {
    const next = chooseColor(baseAwaiting({ type: "wild_draw4" }), 0, "coral");
    expect(next.activeColor).toBe("coral");
    expect(next.pendingDraw).toBe(4);
    expect(next.pendingAction).toBe("draw4");
  });

  test("a choice from the wrong player is ignored", () => {
    const state = baseAwaiting({ type: "wild" });
    expect(chooseColor(state, 1, "coral")).toBe(state);
  });
});

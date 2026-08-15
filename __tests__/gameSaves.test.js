import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  saveGame,
  loadGame,
  clearGame,
  hasSave,
  SAVE_VERSION,
  __resetSaveGuards,
} from "../game/gameSaves";

const KEY = "@cardnight:save:test";

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetSaveGuards();
});

describe("saveGame / loadGame", () => {
  test("round-trips an object", async () => {
    await saveGame(KEY, { score: 5, hand: ["a", "b"] });
    expect(await loadGame(KEY)).toEqual({ score: 5, hand: ["a", "b"] });
  });

  test("loadGame returns null for a missing key", async () => {
    expect(await loadGame("nope")).toBeNull();
  });

  test("a corrupted save returns null and is wiped", async () => {
    await AsyncStorage.setItem(KEY, "{ not valid json");
    expect(await loadGame(KEY)).toBeNull();
    // The bad entry should have been removed so it can't keep failing.
    expect(await hasSave(KEY)).toBe(false);
  });

  test("a save is written with a version wrapper", async () => {
    await saveGame(KEY, { score: 5 });
    const raw = JSON.parse(await AsyncStorage.getItem(KEY));
    expect(raw.__v).toBe(SAVE_VERSION);
    expect(raw.data).toEqual({ score: 5 });
  });

  test("a legacy unwrapped save still loads (treated as v1)", async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ score: 9, hand: ["x"] }));
    expect(await loadGame(KEY)).toEqual({ score: 9, hand: ["x"] });
    expect(await hasSave(KEY)).toBe(true);
  });

  test("a save from a newer/incompatible version is discarded", async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ __v: SAVE_VERSION + 1, data: { score: 1 } }),
    );
    expect(await loadGame(KEY)).toBeNull();
    expect(await hasSave(KEY)).toBe(false);
    // discarded, so the raw entry is gone too
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });
});

describe("clearGame", () => {
  test("removes a saved game", async () => {
    await saveGame(KEY, { score: 1 });
    expect(await hasSave(KEY)).toBe(true);
    await clearGame(KEY);
    expect(await hasSave(KEY)).toBe(false);
    expect(await loadGame(KEY)).toBeNull();
  });
});

describe("clear guard (stray save after quit)", () => {
  test("a save right after clearGame is ignored, then allowed later", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(10000);

    await saveGame(KEY, { score: 1 });
    expect(await hasSave(KEY)).toBe(true);

    await clearGame(KEY); // guards the key at t=10000
    await saveGame(KEY, { score: 2 }); // stray auto-save — dropped
    expect(await hasSave(KEY)).toBe(false);

    // past the guard window, saves work again
    nowSpy.mockReturnValue(10000 + 3000);
    await saveGame(KEY, { score: 3 });
    expect(await loadGame(KEY)).toEqual({ score: 3 });

    nowSpy.mockRestore();
  });
});

describe("hasSave", () => {
  test("is false before saving and true after", async () => {
    expect(await hasSave(KEY)).toBe(false);
    await saveGame(KEY, { score: 1 });
    expect(await hasSave(KEY)).toBe(true);
  });
});

// m11 — clearGame recorded a timestamp per key in an in-memory Map that was
// never pruned. Bounded by the number of game keys, so it's small, but the
// entries also stayed past their usefulness: the guard only matters for
// CLEAR_GUARD_MS, and a stale entry is pure noise.
describe("m11 — the clear guard does not retain entries forever", () => {
  test("an expired guard entry is dropped rather than kept", async () => {
    const { __clearGuardSize } = require("../game/gameSaves");
    __resetSaveGuards();

    await clearGame("@test:prune:a");
    expect(__clearGuardSize()).toBe(1);

    // Past the guard window, a save for the same key is allowed again AND the
    // bookkeeping entry is gone.
    const realNow = Date.now;
    Date.now = () => realNow() + 10_000;
    try {
      await saveGame("@test:prune:a", { ok: true });
      expect(await loadGame("@test:prune:a")).toEqual({ ok: true });
      expect(__clearGuardSize()).toBe(0);
    } finally {
      Date.now = realNow;
    }
  });
});

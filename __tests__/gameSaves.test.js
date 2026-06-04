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

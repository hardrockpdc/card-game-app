import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveGame, loadGame, clearGame, hasSave } from "../game/gameSaves";

const KEY = "@cardnight:save:test";

beforeEach(async () => {
  await AsyncStorage.clear();
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

describe("hasSave", () => {
  test("is false before saving and true after", async () => {
    expect(await hasSave(KEY)).toBe(false);
    await saveGame(KEY, { score: 1 });
    expect(await hasSave(KEY)).toBe(true);
  });
});

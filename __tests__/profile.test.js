import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDisplayName,
  getProfileName,
  hasProfileName,
  loadProfile,
  saveProfile,
  updateProfile,
  recordWin,
  clearProfile,
} from "../game/profile";

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearProfile(); // reset the module's cached profile
});

describe("name helpers (pure)", () => {
  test("getDisplayName falls back to 'Player'", () => {
    expect(getDisplayName({ name: "Pedro" })).toBe("Pedro");
    expect(getDisplayName({ name: "   " })).toBe("Player");
    expect(getDisplayName(null)).toBe("Player");
  });

  test("getProfileName trims; hasProfileName reflects emptiness", () => {
    expect(getProfileName({ name: "  Bob  " })).toBe("Bob");
    expect(hasProfileName({ name: "" })).toBe(false);
    expect(hasProfileName({ name: "Bob" })).toBe(true);
  });
});

describe("saveProfile normalization", () => {
  test("trims the name and migrates legacy card themes", async () => {
    const saved = await saveProfile({ name: "  Ana  ", cardTheme: "hp" });
    expect(saved.name).toBe("Ana");
    expect(saved.cardTheme).toBe("wizards"); // hp -> wizards
    expect((await saveProfile({ cardTheme: "jewel" })).cardTheme).toBe(
      "classic",
    ); // jewel -> classic
  });
});

describe("recordWin", () => {
  test("increments per-game win counts independently", async () => {
    await recordWin("blackjack");
    await recordWin("blackjack");
    await recordWin("poker");

    const profile = await loadProfile();
    expect(profile.stats.blackjack.wins).toBe(2);
    expect(profile.stats.poker.wins).toBe(1);
  });

  test("concurrent recordWin calls don't lose increments (queue)", async () => {
    await Promise.all([
      recordWin("gofish"),
      recordWin("gofish"),
      recordWin("gofish"),
    ]);
    expect((await loadProfile()).stats.gofish.wins).toBe(3);
  });
});

describe("updateProfile", () => {
  test("merges updates over the current profile", async () => {
    await saveProfile({ name: "Start" });
    const updated = await updateProfile({ name: "Changed" });
    expect(updated.name).toBe("Changed");
    expect((await loadProfile()).name).toBe("Changed");
  });
});

describe("clearProfile", () => {
  test("resets to an empty default profile", async () => {
    await saveProfile({ name: "Temp" });
    const cleared = await clearProfile();
    expect(cleared.name).toBe("");
    expect(cleared.stats).toEqual({});
  });
});

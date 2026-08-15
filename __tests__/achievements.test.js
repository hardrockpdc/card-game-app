import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACHIEVEMENTS,
  recordAchievementEvent,
  getEvents,
  getClaimed,
  listAchievements,
  checkAndClaim,
} from "../game/achievements";
import { updateProfile, recordWin, clearProfile } from "../game/profile";
import { getCoins, setCoins, getLifetimeEarned } from "../game/wallet";

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearProfile();
});

describe("recordAchievementEvent", () => {
  test("onlineHosted implies onlinePlayed", async () => {
    await recordAchievementEvent("onlineHosted");
    const e = await getEvents();
    expect(e.onlineHosted).toBe(true);
    expect(e.onlinePlayed).toBe(true);
  });

  test("MP wins accumulate; solo wins don't count", async () => {
    await recordAchievementEvent("win", { isMultiplayer: true });
    await recordAchievementEvent("win", { isMultiplayer: true });
    await recordAchievementEvent("win", { isMultiplayer: false });
    expect((await getEvents()).mpWins).toBe(2);
  });
});

describe("checkAndClaim", () => {
  test("First Win pays 250 once and is idempotent", async () => {
    await setCoins(0);
    await recordWin("gofish");
    const first = await checkAndClaim();
    expect(first.map((a) => a.id)).toContain("first_win");
    const balAfter = await getCoins();

    const second = await checkAndClaim();
    expect(second.map((a) => a.id)).not.toContain("first_win");
    expect(await getCoins()).toBe(balAfter); // no double award
  });

  test("Welcome! needs both a name and a photo", async () => {
    await setCoins(0);
    await updateProfile({ name: "Pedro" });
    let claimed = (await checkAndClaim()).map((a) => a.id);
    expect(claimed).not.toContain("welcome");

    await updateProfile({ photoType: "avatar", photoValue: "cat" });
    claimed = (await checkAndClaim()).map((a) => a.id);
    expect(claimed).toContain("welcome");
  });

  test("Party Animal unlocks at 25 MP wins", async () => {
    await setCoins(0);
    for (let i = 0; i < 24; i++) {
      await recordAchievementEvent("win", { isMultiplayer: true });
    }
    let claimed = (await checkAndClaim()).map((a) => a.id);
    expect(claimed).not.toContain("party_animal");

    await recordAchievementEvent("win", { isMultiplayer: true });
    claimed = (await checkAndClaim()).map((a) => a.id);
    expect(claimed).toContain("party_animal");
  });

  test("awarded coins feed lifetime earned (rank)", async () => {
    await setCoins(0);
    await recordWin("gofish"); // First Win = 250
    await checkAndClaim();
    expect(await getLifetimeEarned()).toBeGreaterThanOrEqual(250);
  });

  test("claimed achievements persist", async () => {
    await recordWin("gofish");
    await checkAndClaim();
    expect(await getClaimed()).toContain("first_win");
  });
});

describe("listAchievements", () => {
  test("returns all achievements with status flags", async () => {
    const list = await listAchievements();
    expect(list).toHaveLength(ACHIEVEMENTS.length);
    for (const a of list) {
      expect(a).toHaveProperty("unlocked");
      expect(a).toHaveProperty("claimed");
      expect(typeof a.reward).toBe("number");
    }
  });

  test("reflects unlocked-but-unclaimed before a claim runs", async () => {
    await recordWin("gofish");
    const list = await listAchievements();
    const firstWin = list.find((a) => a.id === "first_win");
    expect(firstWin.unlocked).toBe(true);
    expect(firstWin.claimed).toBe(false);
  });
});

// M5 — coins were paid BEFORE the claimed-set was persisted, and the persist
// was wrapped in a swallowing try/catch. If that write failed (or the process
// died in the window), the player kept the coins and the achievement stayed
// unclaimed — so the next checkAndClaim paid it again. checkAndClaim runs on
// every Home focus, so the window is hit constantly.
describe("M5 — an award is never paid twice when the claim write fails", () => {
  test("a failed claimed-set write does not pay out", async () => {
    await recordWin("solitaire"); // unlocks first_win + clean_sweep
    const before = await getCoins();

    const realSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(async (key, value) => {
      if (key === "@cardnight:ach:claimed") throw new Error("disk full");
      return realSetItem(key, value);
    });

    let threw = false;
    try {
      await checkAndClaim();
    } catch (_) {
      threw = true;
    }
    AsyncStorage.setItem = realSetItem;

    // Whether it surfaces the error or not, the invariant is the same: coins
    // must not have moved if the claim couldn't be recorded.
    expect(await getCoins()).toBe(before);
    expect(threw || true).toBe(true);
  });

  test("after a failed write, a later successful claim pays exactly once", async () => {
    await recordWin("solitaire");
    const before = await getCoins();

    const realSetItem = AsyncStorage.setItem;
    AsyncStorage.setItem = jest.fn(async (key, value) => {
      if (key === "@cardnight:ach:claimed") throw new Error("disk full");
      return realSetItem(key, value);
    });
    try {
      await checkAndClaim();
    } catch (_) {}
    AsyncStorage.setItem = realSetItem;

    const awarded = await checkAndClaim();
    const total = awarded.reduce((n, a) => n + a.reward, 0);
    expect(await getCoins()).toBe(before + total);

    // And a third call pays nothing more.
    const again = await checkAndClaim();
    expect(again).toEqual([]);
    expect(await getCoins()).toBe(before + total);
  });
});

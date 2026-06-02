import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCoins,
  setCoins,
  addCoins,
  subtractCoins,
  resetCoins,
  getLifetimeEarned,
} from "../game/wallet";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("getCoins", () => {
  test("seeds the starting balance (1000) on first read", async () => {
    expect(await getCoins()).toBe(1000);
  });

  test("returns the stored balance on later reads", async () => {
    await setCoins(250);
    expect(await getCoins()).toBe(250);
  });
});

describe("setCoins", () => {
  test("floors and clamps to a non-negative integer", async () => {
    expect(await setCoins(150.7)).toBe(150);
    expect(await setCoins(-50)).toBe(0);
  });
});

describe("addCoins / subtractCoins", () => {
  test("addCoins increases the balance and lifetime earned", async () => {
    await setCoins(1000);
    expect(await addCoins(250)).toBe(1250);
    expect(await getLifetimeEarned()).toBe(250);
  });

  test("subtractCoins never goes below zero", async () => {
    await setCoins(100);
    expect(await subtractCoins(400)).toBe(0);
  });

  test("lifetime earned only counts additions, not the balance", async () => {
    await setCoins(1000);
    await addCoins(100);
    await subtractCoins(500);
    await addCoins(50);
    expect(await getLifetimeEarned()).toBe(150); // 100 + 50
  });
});

describe("concurrency queue", () => {
  test("concurrent addCoins calls don't lose updates", async () => {
    await setCoins(1000);
    // Fire all three without awaiting between them. The internal queue must
    // serialize the read-modify-write so none of the +100s are lost.
    await Promise.all([addCoins(100), addCoins(100), addCoins(100)]);
    expect(await getCoins()).toBe(1300);
  });
});

describe("resetCoins", () => {
  test("resets the balance to 1000", async () => {
    await setCoins(5);
    expect(await resetCoins()).toBe(1000);
    expect(await getCoins()).toBe(1000);
  });
});

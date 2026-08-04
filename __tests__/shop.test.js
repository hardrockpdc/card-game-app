// M5 (third site) — the cosmetic shops each hand-rolled the same unsafe order:
//
//   const newBalance = await subtractCoins(price);
//   ...
//   await updateProfile({ unlockedThemes: next }).catch(() => {});
//
// Coins were debited, then ownership was persisted with the failure SWALLOWED.
// If that write failed the player paid 3,000 coins and got nothing, with no
// error surfaced. The gate above it also tested a stale `coins` state value
// rather than the live balance.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { purchaseCosmetic } from "../game/shop";
import { getCoins, setCoins } from "../game/wallet";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("purchaseCosmetic — happy path", () => {
  test("debits the price and applies the unlock", async () => {
    await setCoins(5000);
    const apply = jest.fn(async () => {});

    const r = await purchaseCosmetic({ price: 3000, apply });

    expect(r.ok).toBe(true);
    expect(r.balance).toBe(2000);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(await getCoins()).toBe(2000);
  });

  test("a free item costs nothing but still applies", async () => {
    await setCoins(10);
    const apply = jest.fn(async () => {});

    const r = await purchaseCosmetic({ price: 0, apply });

    expect(r.ok).toBe(true);
    expect(apply).toHaveBeenCalled();
    expect(await getCoins()).toBe(10);
  });
});

describe("M5 — the player is never charged for nothing", () => {
  test("a failed unlock write refunds the coins", async () => {
    await setCoins(5000);
    const apply = jest.fn(async () => {
      throw new Error("profile write failed");
    });

    const r = await purchaseCosmetic({ price: 3000, apply });

    expect(r.ok).toBe(false);
    expect(r.reason).toBe("persist-failed");
    expect(await getCoins()).toBe(5000); // fully refunded
  });

  test("the balance is re-checked against storage, not a stale UI value", async () => {
    // The screens gated on a `coins` state variable that could lag behind the
    // real balance. subtractCoins clamps at zero, so an under-funded purchase
    // used to succeed for whatever was left.
    await setCoins(100);
    const apply = jest.fn(async () => {});

    const r = await purchaseCosmetic({ price: 3000, apply });

    expect(r.ok).toBe(false);
    expect(r.reason).toBe("insufficient");
    expect(apply).not.toHaveBeenCalled();
    expect(await getCoins()).toBe(100); // untouched, not clamped to 0
  });

  test("an exactly-affordable purchase succeeds and lands on zero", async () => {
    await setCoins(3000);
    const r = await purchaseCosmetic({ price: 3000, apply: async () => {} });
    expect(r.ok).toBe(true);
    expect(await getCoins()).toBe(0);
  });
});

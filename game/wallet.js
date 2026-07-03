import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_COINS = "@cardnight:wallet:coins";
const KEY_LIFETIME = "@cardnight:wallet:lifetime_earned";
const STARTING_BALANCE = 1000;

// Simple in-memory queue. Every wallet operation lines up behind the previous one
// so concurrent calls can't read-modify-write the same balance and lose coins.
let walletQueue = Promise.resolve();
function enqueue(fn) {
  walletQueue = walletQueue.then(fn, fn);
  return walletQueue;
}

export async function getCoins() {
  try {
    const raw = await AsyncStorage.getItem(KEY_COINS);
    if (raw === null) {
      await AsyncStorage.setItem(KEY_COINS, String(STARTING_BALANCE));
      return STARTING_BALANCE;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : STARTING_BALANCE;
  } catch {
    return STARTING_BALANCE;
  }
}

export async function setCoins(amount) {
  const clamped = Math.max(0, Math.floor(amount));
  await AsyncStorage.setItem(KEY_COINS, String(clamped));
  return clamped;
}

export async function addCoins(amount) {
  return enqueue(async () => {
    const current = await getCoins();
    const next = current + Math.floor(amount);
    await setCoins(next);
    // Track lifetime total — only goes up, never resets with the balance.
    try {
      const rawLifetime = await AsyncStorage.getItem(KEY_LIFETIME);
      const parsed = rawLifetime === null ? 0 : parseInt(rawLifetime, 10);
      const lifetime = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      await AsyncStorage.setItem(
        KEY_LIFETIME,
        String(lifetime + Math.floor(amount)),
      );
    } catch {
      // Lifetime tracking is best-effort. Never let it break the coin award.
    }
    return next;
  });
}

export async function subtractCoins(amount) {
  return enqueue(async () => {
    const current = await getCoins();
    const next = Math.max(0, current - Math.floor(amount));
    await setCoins(next);
    return next;
  });
}

// Full reset: balance back to the starting amount AND lifetime earned wiped
// (so the player's rank resets too). This is a deliberate "start over" action.
export async function resetCoins() {
  await AsyncStorage.setItem(KEY_COINS, String(STARTING_BALANCE));
  await AsyncStorage.setItem(KEY_LIFETIME, "0");
  return STARTING_BALANCE;
}

export async function getLifetimeEarned() {
  try {
    const raw = await AsyncStorage.getItem(KEY_LIFETIME);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

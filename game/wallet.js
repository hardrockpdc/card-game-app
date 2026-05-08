import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_COINS = '@cardnight:wallet:coins';
const KEY_LIFETIME = '@cardnight:wallet:lifetime_earned';
const STARTING_BALANCE = 1000;

export async function getCoins() {
  const raw = await AsyncStorage.getItem(KEY_COINS);
  if (raw === null) {
    await AsyncStorage.setItem(KEY_COINS, String(STARTING_BALANCE));
    return STARTING_BALANCE;
  }
  return parseInt(raw, 10);
}

export async function setCoins(amount) {
  const clamped = Math.max(0, Math.floor(amount));
  await AsyncStorage.setItem(KEY_COINS, String(clamped));
  return clamped;
}

export async function addCoins(amount) {
  const current = await getCoins();
  const next = current + Math.floor(amount);
  await setCoins(next);
  // Track lifetime total — only goes up, never resets with the balance.
  const rawLifetime = await AsyncStorage.getItem(KEY_LIFETIME);
  const lifetime = rawLifetime === null ? 0 : parseInt(rawLifetime, 10);
  await AsyncStorage.setItem(KEY_LIFETIME, String(lifetime + Math.floor(amount)));
  return next;
}

export async function subtractCoins(amount) {
  const current = await getCoins();
  const next = Math.max(0, current - Math.floor(amount));
  await setCoins(next);
  return next;
}

export async function resetCoins() {
  await AsyncStorage.setItem(KEY_COINS, String(STARTING_BALANCE));
  return STARTING_BALANCE;
}

export async function getLifetimeEarned() {
  const raw = await AsyncStorage.getItem(KEY_LIFETIME);
  return raw === null ? 0 : parseInt(raw, 10);
}

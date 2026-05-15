import AsyncStorage from "@react-native-async-storage/async-storage";
import { warn } from "./logger";

export async function saveGame(gameKey, state) {
  try {
    await AsyncStorage.setItem(gameKey, JSON.stringify(state));
  } catch (err) {
    warn("[gameSaves] save failed:", err);
  }
}

export async function loadGame(gameKey) {
  try {
    const raw = await AsyncStorage.getItem(gameKey);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    warn("[gameSaves] load failed — wiping corrupted save:", err);
    await AsyncStorage.removeItem(gameKey).catch(() => {});
    return null;
  }
}

export async function clearGame(gameKey) {
  try {
    await AsyncStorage.removeItem(gameKey);
  } catch (err) {
    warn("[gameSaves] clear failed:", err);
  }
}

export async function hasSave(gameKey) {
  try {
    const raw = await AsyncStorage.getItem(gameKey);
    return raw !== null;
  } catch (err) {
    warn("[gameSaves] hasSave check failed:", err);
    return false;
  }
}

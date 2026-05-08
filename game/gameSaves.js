import AsyncStorage from "@react-native-async-storage/async-storage";

export async function saveGame(gameKey, state) {
  try {
    await AsyncStorage.setItem(gameKey, JSON.stringify(state));
  } catch {
    // Storage failure is non-fatal — game continues without saving.
  }
}

export async function loadGame(gameKey) {
  try {
    const raw = await AsyncStorage.getItem(gameKey);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    // Corrupted save — wipe it and treat as no save.
    await AsyncStorage.removeItem(gameKey).catch(() => {});
    return null;
  }
}

export async function clearGame(gameKey) {
  try {
    await AsyncStorage.removeItem(gameKey);
  } catch {
    // Non-fatal.
  }
}

export async function hasSave(gameKey) {
  try {
    const raw = await AsyncStorage.getItem(gameKey);
    return raw !== null;
  } catch {
    return false;
  }
}

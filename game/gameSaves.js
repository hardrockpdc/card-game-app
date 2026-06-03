import AsyncStorage from "@react-native-async-storage/async-storage";
import { warn } from "./logger";

// Bump this whenever a saved game's shape changes in a backward-incompatible
// way. On load, any save whose version doesn't match is discarded (the game
// starts fresh) instead of being restored into a screen that expects the new
// shape — which would crash. Saves written before versioning existed have no
// `__v` and are treated as version 1, so they keep working until the next bump.
export const SAVE_VERSION = 1;

export async function saveGame(gameKey, state) {
  try {
    await AsyncStorage.setItem(
      gameKey,
      JSON.stringify({ __v: SAVE_VERSION, data: state }),
    );
  } catch (err) {
    warn("[gameSaves] save failed:", err);
  }
}

// Reads, parses and version-checks a save. Returns the stored payload, or null
// if the entry is missing, corrupt, or from an incompatible version — and wipes
// the bad entry so it can't keep failing or trigger a dead "resume" prompt.
async function readValidSave(gameKey) {
  const raw = await AsyncStorage.getItem(gameKey);
  if (raw === null) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    warn("[gameSaves] corrupted save — wiping:", err);
    await AsyncStorage.removeItem(gameKey).catch(() => {});
    return null;
  }

  const wrapped =
    parsed && typeof parsed === "object" && typeof parsed.__v === "number";
  const version = wrapped ? parsed.__v : 1; // legacy unwrapped save == v1
  const payload = wrapped ? parsed.data : parsed;

  if (version !== SAVE_VERSION) {
    warn(`[gameSaves] save version ${version} != ${SAVE_VERSION} — discarding`);
    await AsyncStorage.removeItem(gameKey).catch(() => {});
    return null;
  }

  return payload ?? null;
}

export async function loadGame(gameKey) {
  try {
    return await readValidSave(gameKey);
  } catch (err) {
    warn("[gameSaves] load failed:", err);
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

// True only when a *valid, current-version* save exists, so the resume prompt
// never offers to continue a save that loadGame would reject.
export async function hasSave(gameKey) {
  try {
    return (await readValidSave(gameKey)) !== null;
  } catch (err) {
    warn("[gameSaves] hasSave check failed:", err);
    return false;
  }
}

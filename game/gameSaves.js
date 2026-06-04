import AsyncStorage from "@react-native-async-storage/async-storage";
import { warn } from "./logger";

// Bump this whenever a saved game's shape changes in a backward-incompatible
// way. On load, any save whose version doesn't match is discarded (the game
// starts fresh) instead of being restored into a screen that expects the new
// shape — which would crash. Saves written before versioning existed have no
// `__v` and are treated as version 1, so they keep working until the next bump.
export const SAVE_VERSION = 1;

// When the user quits / restarts / wins we clearGame(), but a throttled
// auto-save effect can fire one more time during teardown (e.g. a per-second
// timer tick) and re-write the save we just cleared — so going back offers a
// dead "resume". To prevent that, ignore saves for a key for a short window
// after it was cleared. The auto-save throttle (~3s) is longer than this guard,
// so a freshly restarted game still saves normally afterward.
const CLEAR_GUARD_MS = 2500;
const _recentlyCleared = new Map(); // gameKey -> timestamp

// Test-only: reset the in-memory clear guards between cases.
export function __resetSaveGuards() {
  _recentlyCleared.clear();
}

export async function saveGame(gameKey, state) {
  const clearedAt = _recentlyCleared.get(gameKey);
  if (clearedAt && Date.now() - clearedAt < CLEAR_GUARD_MS) {
    // A clear just happened for this key — drop this stray save.
    return;
  }
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
  // Block stray auto-saves that land just after this clear (see saveGame).
  _recentlyCleared.set(gameKey, Date.now());
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

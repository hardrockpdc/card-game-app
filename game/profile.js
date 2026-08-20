import AsyncStorage from "@react-native-async-storage/async-storage";
import { warn } from "./logger";

const PROFILE_STORAGE_KEY = "@card-night/profile";

const DEFAULT_PROFILE = {
  name: "",
  photoType: null,
  photoValue: null,
  cardTheme: "classic",
  stats: {},
  // Coin-unlocked cosmetics the player owns. Free items aren't listed here —
  // they're always available (see isThemeUnlocked / isFeltUnlocked). Extend with
  // unlockedFrames as that shop is added.
  unlockedThemes: [],
  unlockedFelts: [],
  unlockedFrames: [],
  // The profile frame currently worn (decorative ring around the avatar).
  activeFrame: "none",
};

let cachedProfile = null;
let cachedDefault = null;
const listeners = new Set();

// BUG-2: Serialize profile writes so concurrent recordWin / updateProfile calls
// don't stomp on each other. Same pattern as game/wallet.js enqueue.
let profileQueue = Promise.resolve();
function enqueue(fn) {
  profileQueue = profileQueue.then(fn, fn);
  return profileQueue;
}

function normalizeProfile(profile) {
  const safeProfile = profile || {};
  return {
    ...DEFAULT_PROFILE,
    ...safeProfile,
    name: typeof safeProfile.name === "string" ? safeProfile.name.trim() : "",
    photoType:
      safeProfile.photoType === "avatar" || safeProfile.photoType === "custom"
        ? safeProfile.photoType
        : null,
    photoValue:
      typeof safeProfile.photoValue === "string" &&
      safeProfile.photoValue.trim()
        ? safeProfile.photoValue
        : null,
    cardTheme: (() => {
      const raw = safeProfile.cardTheme;
      if (typeof raw !== "string" || !raw.trim()) {
        return DEFAULT_PROFILE.cardTheme;
      }
      const normalized = raw.trim();
      if (normalized === "hp") return "wizards";
      if (normalized === "jewel") return "classic";
      return normalized;
    })(),
    stats:
      safeProfile.stats && typeof safeProfile.stats === "object"
        ? { ...safeProfile.stats }
        : {},
    unlockedThemes: Array.isArray(safeProfile.unlockedThemes)
      ? safeProfile.unlockedThemes.filter((t) => typeof t === "string")
      : [],
    unlockedFelts: Array.isArray(safeProfile.unlockedFelts)
      ? safeProfile.unlockedFelts.filter((t) => typeof t === "string")
      : [],
    unlockedFrames: Array.isArray(safeProfile.unlockedFrames)
      ? safeProfile.unlockedFrames.filter((t) => typeof t === "string")
      : [],
    activeFrame:
      typeof safeProfile.activeFrame === "string" && safeProfile.activeFrame.trim()
        ? safeProfile.activeFrame.trim()
        : "none",
  };
}

function notifyProfileListeners(profile) {
  listeners.forEach((listener) => {
    try {
      listener(profile);
    } catch (_) {}
  });
}

export function getDefaultProfile() {
  // BUG-3: Cache the default object so repeated calls return the same
  // reference (lets memoized components skip unnecessary re-renders).
  if (!cachedDefault) {
    cachedDefault = { ...DEFAULT_PROFILE, stats: {} };
  }
  return cachedDefault;
}

export function getCachedProfile() {
  return cachedProfile || getDefaultProfile();
}

export function getProfileName(profile) {
  return profile?.name?.trim() || "";
}

export function getDisplayName(profile) {
  return getProfileName(profile) || "Player";
}

export function hasProfileName(profile) {
  return Boolean(getProfileName(profile));
}

export async function loadProfile() {
  if (cachedProfile) {
    return cachedProfile;
  }

  try {
    const rawProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    cachedProfile = rawProfile
      ? normalizeProfile(JSON.parse(rawProfile))
      : getDefaultProfile();
  } catch (error) {
    warn("[profile] Failed to load profile", error);
    cachedProfile = getDefaultProfile();
  }

  return cachedProfile;
}

export async function saveProfile(profile) {
  const nextProfile = normalizeProfile(profile);

  try {
    await AsyncStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(nextProfile),
    );
  } catch (error) {
    warn("[profile] Failed to save profile", error);
  }

  cachedProfile = nextProfile;
  notifyProfileListeners(nextProfile);
  return nextProfile;
}

export async function updateProfile(updates) {
  return enqueue(async () => {
    const currentProfile = await loadProfile();
    return saveProfile({ ...currentProfile, ...updates });
  });
}

export async function recordWin(gameId) {
  return enqueue(async () => {
    const profile = await loadProfile();
    const stats = { ...profile.stats };
    const entry = stats[gameId] || { wins: 0 };
    stats[gameId] = { wins: entry.wins + 1 };
    await saveProfile({ ...profile, stats });
  });
}

export function subscribeProfile(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function clearProfile() {
  try {
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch (error) {
    warn("[profile] Failed to clear profile", error);
  }

  cachedProfile = getDefaultProfile();
  notifyProfileListeners(cachedProfile);
  return cachedProfile;
}

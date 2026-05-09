import AsyncStorage from "@react-native-async-storage/async-storage";
import { warn } from "./logger";

const PROFILE_STORAGE_KEY = "@card-night/profile";

const DEFAULT_PROFILE = {
  name: "",
  photoType: null,
  photoValue: null,
  cardTheme: "neon",
  stats: {},
};

let cachedProfile = null;
const listeners = new Set();

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
    cardTheme:
      typeof safeProfile.cardTheme === "string" && safeProfile.cardTheme.trim()
        ? safeProfile.cardTheme.trim()
        : DEFAULT_PROFILE.cardTheme,
    stats:
      safeProfile.stats && typeof safeProfile.stats === "object"
        ? { ...safeProfile.stats }
        : {},
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
  return { ...DEFAULT_PROFILE, stats: {} };
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
  const currentProfile = await loadProfile();
  return saveProfile({ ...currentProfile, ...updates });
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

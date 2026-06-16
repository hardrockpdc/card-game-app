import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

// Lightweight haptics wrapper. Mirrors game/sounds.js: a persisted on/off flag
// plus safe helpers that no-op when disabled and never throw (haptics aren't
// available on every device / the simulator). Default ON.

const KEY = "@cardnight:hapticsEnabled";
let _enabled = true;
const listeners = new Set();

export async function initHaptics() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw != null) _enabled = raw === "true";
  } catch (_) {
    // keep default
  }
}

export function getHapticsEnabled() {
  return _enabled;
}

export async function setHapticsEnabled(value) {
  _enabled = !!value;
  listeners.forEach((fn) => {
    try {
      fn(_enabled);
    } catch (_) {}
  });
  try {
    await AsyncStorage.setItem(KEY, String(_enabled));
  } catch (_) {}
}

export function subscribeHaptics(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Trigger helpers (no-op when disabled; swallow unsupported-device errors) ──

export function hapticImpact(style = Haptics.ImpactFeedbackStyle.Light) {
  if (!_enabled) return;
  Haptics.impactAsync(style).catch(() => {});
}

export function hapticNotify(type = Haptics.NotificationFeedbackType.Success) {
  if (!_enabled) return;
  Haptics.notificationAsync(type).catch(() => {});
}

export function hapticSelection() {
  if (!_enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

// Re-export the enums so callers don't need to import expo-haptics directly.
export const HapticStyle = Haptics.ImpactFeedbackStyle;
export const HapticType = Haptics.NotificationFeedbackType;

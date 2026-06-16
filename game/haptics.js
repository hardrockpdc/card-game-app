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

// ── Semantic patterns ───────────────────────────────────────────────────────
// expo-haptics only exposes a few primitives, so we *compose* them into named
// patterns that map to game EVENTS. The goal is that each event feels distinct
// enough to recognise without looking:
//   • button → a tiny tick
//   • win    → three taps that RISE  (light → medium → heavy)
//   • lose   → a heavy thud that settles (heavy → soft echo)
//   • error  → the OS's sharp "rejection" buzz
// Prefer these in game code over the raw helpers above.

const Style = Haptics.ImpactFeedbackStyle;

// Fire an impact later, re-checking the enabled flag in case it was turned off
// mid-pattern.
function impactLater(style, ms) {
  setTimeout(() => {
    if (_enabled) Haptics.impactAsync(style).catch(() => {});
  }, ms);
}

// Light tick — button/menu presses, card pick-up, selections.
export function hapticButton() {
  if (!_enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

// Rising three-tap flourish — a win / round won. Reads as celebratory.
export function hapticWin() {
  if (!_enabled) return;
  Haptics.impactAsync(Style.Light).catch(() => {});
  impactLater(Style.Medium, 90);
  impactLater(Style.Heavy, 190);
}

// Heavy thud + soft echo — a loss / bust. Reads as "down".
export function hapticLose() {
  if (!_enabled) return;
  Haptics.impactAsync(Style.Heavy).catch(() => {});
  impactLater(Style.Light, 150);
}

// Sharp rejection buzz — an illegal move / error (e.g. an illegal Solitaire
// drop or an unplayable Last Card card).
export function hapticError() {
  if (!_enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

// Re-export the enums so callers don't need to import expo-haptics directly.
export const HapticStyle = Haptics.ImpactFeedbackStyle;
export const HapticType = Haptics.NotificationFeedbackType;

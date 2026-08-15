// One shared source of truth for the OS "reduce motion" setting.
//
// Every animated component used to query and subscribe on its own: Card's
// DealWrapper and FlipCard each called AccessibilityInfo.isReduceMotionEnabled()
// and each registered a 'reduceMotionChanged' listener, so a card with both
// animateDeal and animateReveal paid for two of each. Solitaire renders up to
// 52 cards — roughly 50-100 async native bridge calls plus that many live
// listeners per deal, rebuilt on every re-layout.
//
// This queries the native API once, keeps one subscription, and fans the value
// out to every consumer. The React binding lives in useReduceMotion below.
//
// The accessibility API is injected rather than imported directly so the
// store's contract is unit-testable without a React Native renderer.
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

let a11y = AccessibilityInfo;
let started = false;
let value = false; // default: animations ON, matching prior behaviour
const subscribers = new Set();

function notify(next) {
  if (next === value) return;
  value = next;
  subscribers.forEach((fn) => {
    try {
      fn(next);
    } catch (_) {
      // One bad consumer must not stop the rest from updating.
    }
  });
}

// Safe to call repeatedly; only the first call touches the native API.
export function initReduceMotion() {
  if (started) return;
  started = true;
  if (!a11y) return;

  try {
    a11y
      .isReduceMotionEnabled()
      .then((enabled) => notify(!!enabled))
      .catch(() => {});
    a11y.addEventListener("reduceMotionChanged", (enabled) =>
      notify(!!enabled),
    );
  } catch (_) {
    // Accessibility API unavailable — leave motion enabled.
  }
}

export function getReduceMotion() {
  return value;
}

export function subscribeReduceMotion(fn) {
  initReduceMotion();
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// React binding. Components get the cached value immediately — no per-mount
// async gap where a card animates before the setting resolves.
export function useReduceMotion() {
  const [enabled, setEnabled] = useState(getReduceMotion);
  useEffect(() => subscribeReduceMotion(setEnabled), []);
  return enabled;
}

// ─── Test seams ──────────────────────────────────────────────────────────────
export function __setAccessibilityBackend(fake) {
  a11y = fake;
}

export function __resetForTests() {
  a11y = AccessibilityInfo;
  started = false;
  value = false;
  subscribers.clear();
}

import { Dimensions } from "react-native";

// Reference width: iPhone 14 / Pixel 7 baseline (390px).
// Dimensions.get is safe at module level because the app is portrait-locked —
// width never changes after launch.
const BASE_WIDTH = 390;

export function scale(size) {
  const { width } = Dimensions.get("window");
  const factor = Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.5);
  return Math.round(size * factor);
}

// Slightly tighter bounds for text — fonts don't need to grow as aggressively.
export function scaleFont(size) {
  const { width } = Dimensions.get("window");
  const factor = Math.min(Math.max(width / BASE_WIDTH, 0.9), 1.4);
  return Math.round(size * factor);
}

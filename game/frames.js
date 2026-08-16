import { gold, positive, accent, highlight, brandRed } from "./colors";
import { buildChipStyle } from "./chipStyle";

// Profile frames — decorative borders drawn AROUND the existing profile avatar
// (photo, emoji, or initial alike). Pure View/border geometry, no image
// assets, so they're cheap and render anywhere ProfileAvatar does. Cosmetic-only
// and coin-unlocked, mirroring decks (cardTheme.js) and felts (feltShop.js).
//
// `none` is the free default. Two frame families:
//   "ring" (default, unset `style`) — a plain colored border, optional glow.
//   "chip" — a poker-chip medallion: a colored body plus 8 edge-spot stripes
//     around the rim (classic casino-chip pattern), optional glow/pulse. Uses
//     real chip color-value conventions (White $1 / Red $5 / Blue $10 /
//     Green $25 / Black $100 / Purple $500) so the price ladder tells its own
//     story instead of an arbitrary gem-name rainbow. Colors are grounded in
//     `game/colors.js` where a token fits (Blue=accent, Green=positive,
//     Purple=highlight, Red=brandRed, gold spots=gold); White/Black chip
//     bodies have no matching token and are the deliberate off-palette pair,
//     same rationale as Neon/Rose in the ring family.
//
// Unlocks are stored on the profile as `unlockedFrames`; the chosen one is
// `activeFrame`.

const FRAMES = {
  none: { name: "None", price: 0, color: null },

  // ── Rings ──────────────────────────────────────────────────────────────
  gold: { name: "Gold Ring", price: 1000, color: "#ffd479", glow: false },
  neon: { name: "Neon Glow", price: 1000, color: "#5ad1e6", glow: true },
  ruby: { name: "Ruby", price: 1000, color: "#e94560", glow: true },
  emerald: { name: "Emerald", price: 1000, color: "#3fbf6d", glow: true },
  royal: { name: "Royal", price: 1000, color: "#c9a6ff", glow: true },
  rose: { name: "Rose", price: 1000, color: "#ffb3a0", glow: false },

  // ── Poker chips ────────────────────────────────────────────────────────
  chipWhite: {
    name: "White Chip",
    price: 1000,
    style: "chip",
    color: "#f4f2ea",
    spotColor: brandRed,
    glow: false,
  },
  chipRed: {
    name: "Red Chip",
    price: 1000,
    style: "chip",
    color: brandRed,
    spotColor: "#ffffff",
    glow: false,
  },
  chipBlue: {
    name: "Blue Chip",
    price: 1500,
    style: "chip",
    color: accent,
    spotColor: gold,
    glow: true,
  },
  chipGreen: {
    name: "Green Chip",
    price: 1500,
    style: "chip",
    color: positive,
    spotColor: "#16213e",
    glow: true,
  },
  chipBlack: {
    name: "Black Chip",
    price: 2000,
    style: "chip",
    color: "#1c1c26",
    spotColor: gold,
    glow: true,
  },
  chipPurple: {
    name: "Purple Chip",
    price: 2500,
    style: "chip",
    color: highlight,
    spotColor: gold,
    glow: true,
    pulse: true,
  },
};

export const FRAMES_LIST = Object.entries(FRAMES);

export function getFrame(id) {
  return FRAMES[id] || FRAMES.none;
}

export function getFramePrice(id) {
  return FRAMES[id]?.price ?? 0;
}

// A frame is available if it's free (none) or the player owns it. `activeId`
// grandfathers whatever is currently selected so nobody gets stuck.
export function isFrameUnlocked(id, unlockedFrames, activeId) {
  return (
    getFramePrice(id) === 0 ||
    (Array.isArray(unlockedFrames) && unlockedFrames.includes(id)) ||
    id === activeId
  );
}

// Ring style for an avatar of pixel `size`. Returns null for "none" (no frame)
// or a "chip"-style frame (use getChipStyle for those instead), so
// ProfileAvatar can skip the wrapper entirely and behave exactly as before.
export function getFrameRingStyle(id, size) {
  const frame = getFrame(id);
  if (!frame.color || frame.style === "chip") return null;
  const borderWidth = Math.max(2, Math.round(size * 0.07));
  const ring = {
    borderWidth,
    borderColor: frame.color,
    borderRadius: (size + borderWidth * 2) / 2,
    padding: borderWidth,
  };
  if (frame.glow) {
    ring.shadowColor = frame.color;
    ring.shadowOpacity = 0.9;
    ring.shadowRadius = borderWidth * 1.5;
    ring.shadowOffset = { width: 0, height: 0 };
    ring.elevation = 8;
  }
  return ring;
}

// Poker-chip geometry for an avatar of pixel `size`. Returns null unless the
// frame's style is "chip". Geometry (bevel gradient, edge spots, inlay ring)
// lives in chipStyle.js so Blackjack's bet-chip picker can render the same
// realistic chip anatomy from its own base colors.
export function getChipStyle(id, size) {
  const frame = getFrame(id);
  if (frame.style !== "chip") return null;
  const chip = buildChipStyle({
    size,
    color: frame.color,
    spotColor: frame.spotColor,
    glow: frame.glow,
  });
  chip.pulse = Boolean(frame.pulse);
  return chip;
}

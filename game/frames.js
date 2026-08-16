import { gold, positive, accent, highlight, brandRed } from "./colors";

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

// Lightens (positive percent) or darkens (negative) a 6-digit hex color by
// blending toward white/black. Used to derive a chip's bevel gradient stops
// from its single base color, so each chip only has to define one color.
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  if (percent >= 0) {
    r += (255 - r) * percent;
    g += (255 - g) * percent;
    b += (255 - b) * percent;
  } else {
    r *= 1 + percent;
    g *= 1 + percent;
    b *= 1 + percent;
  }
  const clamp = (v) => Math.round(Math.min(255, Math.max(0, v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

// Poker-chip geometry for an avatar of pixel `size`. Returns null unless the
// frame's style is "chip". A real chip has three concentric zones — a
// spotted outer rim, a plain inlay ring, and the center face — so this
// builds two nested rings around the avatar instead of one:
//   outer ring (rimWidth)   — spotted, diagonal bevel gradient (bodyGradient)
//   inner ring (inlayWidth) — plain, a lighter tint (inlayColor), no spots
//   avatar                  — the "face", unchanged
// Both `chipSize` (outer diameter) and `inlaySize` (the boundary between the
// two rings) are returned so ProfileAvatar can nest them; the 8 edge spots
// are positioned (by plain trig, no SVG/new dependency) on the OUTER ring's
// midline only, not spanning the whole body.
const SPOT_COUNT = 8;

export function getChipStyle(id, size) {
  const frame = getFrame(id);
  if (frame.style !== "chip") return null;

  const rimWidth = Math.max(3, Math.round(size * 0.1));
  const inlayWidth = Math.max(2, Math.round(size * 0.06));
  const bodyWidth = rimWidth + inlayWidth;
  const chipSize = size + bodyWidth * 2;
  const chipRadius = chipSize / 2;
  const inlaySize = size + inlayWidth * 2;

  const spotWidth = Math.max(2, Math.round(size * 0.045));
  const spotLength = Math.round(rimWidth * 0.85);
  // Spots sit centered on the OUTER ring's midline only — half hangs over
  // the outer edge, half over the rim/inlay boundary — reads as notches cut
  // into the rim, not the whole chip body.
  const spotDistance = chipRadius - rimWidth / 2;

  const spots = [];
  for (let i = 0; i < SPOT_COUNT; i++) {
    const angleDeg = (360 / SPOT_COUNT) * i;
    const angleRad = (angleDeg * Math.PI) / 180;
    const cx = chipRadius + spotDistance * Math.cos(angleRad);
    const cy = chipRadius + spotDistance * Math.sin(angleRad);
    spots.push({
      left: Math.round(cx - spotWidth / 2),
      top: Math.round(cy - spotLength / 2),
      width: spotWidth,
      height: spotLength,
      rotate: `${angleDeg + 90}deg`,
    });
  }

  const chip = {
    chipSize,
    inlaySize,
    color: frame.color,
    spotColor: frame.spotColor,
    spots,
    pulse: Boolean(frame.pulse),
    // Diagonal bevel for the outer ring: lightened corner -> base -> darkened.
    bodyGradient: [
      shadeColor(frame.color, 0.3),
      frame.color,
      shadeColor(frame.color, -0.35),
    ],
    // The inlay ring is a flat, slightly darker tint — reads as a distinct
    // inner band, not just more of the same bevel.
    inlayColor: shadeColor(frame.color, -0.15),
    edgeColor: shadeColor(frame.color, -0.55),
  };
  if (frame.glow) {
    chip.shadowColor = frame.color;
    chip.shadowOpacity = 0.9;
    chip.shadowRadius = rimWidth * 1.4;
    chip.shadowOffset = { width: 0, height: 0 };
    chip.elevation = 8;
  }
  return chip;
}

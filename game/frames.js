import { gold, positive, highlight, highlightDim } from "./colors";

// Profile frames — decorative rings drawn AROUND the existing profile avatar
// (photo, emoji, or initial alike). Pure CSS (border + optional glow/pulse), no
// image assets, so they're cheap and render anywhere ProfileAvatar does.
// Cosmetic-only and coin-unlocked, mirroring decks (cardTheme.js) and felts
// (feltShop.js).
//
// `none` is the free default. Each other frame has a color, a `style` (how the
// ring is drawn), an optional glow, and an optional pulse animation. Price
// scales with visual complexity: plain solid/dashed rings are cheapest, a glow
// or a second visual trick (pips, a second ring color) costs more, animated
// (`pulse`) frames are the top tier. Unlocks are stored on the profile as
// `unlockedFrames`; the chosen one is `activeFrame`.
//
// Colors are grounded in `game/colors.js` where a token actually fits, rather
// than invented separately: Gold Ring reuses the app's real `gold` (coin)
// token instead of a near-miss shade, Royal reclaims `highlight`/
// `highlightDim` — that pair's own comment in colors.js says it started as
// "the avatar ring" purple before being folded into the general token — and
// Emerald reuses `positive` (the "your turn"/success green) instead of an
// unrelated green. Neon and Rose are deliberately NOT tied to any chrome
// token: cosmetics are the one place allowed to introduce color the rest of
// the UI doesn't use, so the shop reads as a reward, not more app chrome.
//
// `style` values, each handled by ProfileAvatar:
//   "solid"  — a single-color ring (the original look)
//   "dashed" — a single-color dashed ring
//   "double" — two concentric rings, `color` outer + `innerColor` inner
//   "pips"   — a solid ring plus two small `pipGlyph` corner badges. Kept
//              exclusive to Ruby — one signature flourish, not spread across
//              every frame, so it stays a flourish instead of decoration.

const FRAMES = {
  none: { name: "None", price: 0, color: null },
  gold: {
    name: "Gold Ring",
    price: 1000,
    color: gold,
    style: "solid",
    glow: false,
  },
  rose: {
    name: "Rose",
    price: 1000,
    color: "#ffb3a0",
    style: "dashed",
    glow: false,
  },
  emerald: {
    name: "Emerald",
    price: 1500,
    color: positive,
    style: "solid",
    glow: true,
  },
  ruby: {
    name: "Ruby",
    price: 1500,
    color: "#e94560",
    style: "pips",
    pipGlyph: "♥",
    glow: true,
  },
  neon: {
    name: "Neon Glow",
    price: 2000,
    color: "#5ad1e6",
    style: "solid",
    glow: true,
    pulse: true,
  },
  royal: {
    name: "Royal",
    price: 2500,
    color: highlight,
    innerColor: highlightDim,
    style: "double",
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

// Ring style for an avatar of pixel `size`. Returns null for "none" (no frame),
// so ProfileAvatar can skip the wrapper entirely and behave exactly as before.
//
// Always includes `style` (solid/dashed/double/pips) and `pulse` so
// ProfileAvatar can branch on them. `innerRing` (double) and `pipGlyph`/
// `pipColor` (pips) are only present for those styles.
export function getFrameRingStyle(id, size) {
  const frame = getFrame(id);
  if (!frame.color) return null;
  const style = frame.style || "solid";
  const borderWidth = Math.max(2, Math.round(size * 0.07));

  // "double" wraps the avatar in a thin inner ring first, then the outer ring
  // sizes itself around THAT (not the raw avatar), so the two rings nest
  // instead of overlapping.
  let innerRing = null;
  let wrappedSize = size;
  if (style === "double" && frame.innerColor) {
    const innerBorderWidth = Math.max(1, Math.round(borderWidth * 0.45));
    wrappedSize = size + innerBorderWidth * 2;
    innerRing = {
      borderWidth: innerBorderWidth,
      borderColor: frame.innerColor,
      borderRadius: wrappedSize / 2,
      padding: innerBorderWidth,
    };
  }

  const ring = {
    style,
    pulse: Boolean(frame.pulse),
    borderWidth,
    borderColor: frame.color,
    borderRadius: (wrappedSize + borderWidth * 2) / 2,
    padding: borderWidth,
  };
  if (style === "dashed") {
    ring.borderStyle = "dashed";
  }
  if (innerRing) {
    ring.innerRing = innerRing;
  }
  if (style === "pips" && frame.pipGlyph) {
    ring.pipGlyph = frame.pipGlyph;
    ring.pipColor = frame.color;
  }
  if (frame.glow) {
    ring.shadowColor = frame.color;
    ring.shadowOpacity = 0.9;
    ring.shadowRadius = borderWidth * 1.5;
    ring.shadowOffset = { width: 0, height: 0 };
    ring.elevation = 8;
  }
  return ring;
}

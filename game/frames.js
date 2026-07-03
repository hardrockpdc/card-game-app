// Profile frames — decorative rings drawn AROUND the existing profile avatar
// (photo, emoji, or initial alike). Pure CSS (border + optional glow), no image
// assets, so they're cheap and render anywhere ProfileAvatar does. Cosmetic-only
// and coin-unlocked, mirroring decks (cardTheme.js) and felts (feltShop.js).
//
// `none` is the free default. Each other frame has a color, a border-width ratio
// (of the avatar size), and an optional glow. Unlocks are stored on the profile
// as `unlockedFrames`; the chosen one is `activeFrame`.

const FRAMES = {
  none: { name: "None", price: 0, color: null },
  gold: { name: "Gold Ring", price: 1000, color: "#ffd479", glow: false },
  neon: { name: "Neon Glow", price: 1000, color: "#5ad1e6", glow: true },
  ruby: { name: "Ruby", price: 1000, color: "#e94560", glow: true },
  emerald: { name: "Emerald", price: 1000, color: "#3fbf6d", glow: true },
  royal: { name: "Royal", price: 1000, color: "#c9a6ff", glow: true },
  rose: { name: "Rose", price: 1000, color: "#ffb3a0", glow: false },
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
export function getFrameRingStyle(id, size) {
  const frame = getFrame(id);
  if (!frame.color) return null;
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

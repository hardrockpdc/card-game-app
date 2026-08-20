// Player ranks — pure status/prestige, no gameplay advantage (stays fair in
// multiplayer + family-friendly). Rank is derived from LIFETIME coins earned,
// NOT the current balance, so spending coins on cosmetics never demotes you.
// The wallet exposes getLifetimeEarned(); this file just maps that number to a
// rank. Pure JS, no persistence of its own.

export const RANKS = [
  { name: "Rookie", icon: "🃏", threshold: 0 },
  { name: "Card Shark", icon: "♠", threshold: 5000 },
  { name: "High Roller", icon: "🎩", threshold: 20000 },
  { name: "Ace", icon: "👑", threshold: 50000 },
  { name: "Legend", icon: "🌟", threshold: 100000 },
];

// Returns the player's current rank plus the next one (for progress display).
// { name, icon, threshold, next } — `next` is null at the top rank.
export function getRank(lifetimeEarned) {
  const earned = Number.isFinite(lifetimeEarned) && lifetimeEarned >= 0
    ? lifetimeEarned
    : 0;
  let current = RANKS[0];
  let next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (earned >= RANKS[i].threshold) {
      current = RANKS[i];
      next = RANKS[i + 1] || null;
    } else {
      break;
    }
  }
  return { ...current, next };
}

// Progress toward the next rank as a 0..1 fraction (1 when at the top rank).
export function getRankProgress(lifetimeEarned) {
  const earned = Number.isFinite(lifetimeEarned) && lifetimeEarned >= 0
    ? lifetimeEarned
    : 0;
  const { threshold, next } = getRank(earned);
  if (!next) return 1;
  const span = next.threshold - threshold;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (earned - threshold) / span));
}

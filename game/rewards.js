// Central win-reward table for the coin economy. Multiplayer pays ~2–2.5×
// single-player to reward social play and stop easy coin-farming vs the AI.
// Blackjack is bet-based (handled in its own screen) and not listed here.
// Solitaire and Who Am I? are single-mode games (solo-only / MP-only).

const REWARDS = {
  // gameId: { sp, mp }  (a null side means that mode doesn't exist for the game)
  gofish: { sp: 100, mp: 250 },
  lastcard: { sp: 100, mp: 250 },
  conquian: { sp: 150, mp: 350 },
  rummy: { sp: 150, mp: 350 },
  poker: { sp: 200, mp: 500 },
  solitaire: { sp: 150, mp: null },
  whoami: { sp: null, mp: 300 },
};

// Coins awarded for a win. `isMultiplayer` picks the tier. Falls back to 0 for
// an unknown game or a mode the game doesn't support.
export function getWinReward(gameId, isMultiplayer) {
  const entry = REWARDS[gameId];
  if (!entry) return 0;
  const value = isMultiplayer ? entry.mp : entry.sp;
  return typeof value === "number" ? value : 0;
}

// Memory Match is solo-only and pays by board difficulty (bigger board = more
// coins), so it uses this tiered helper instead of the flat REWARDS table.
//
// Memory has no AI-turn delay and every board is winnable, so unlike the
// other single-player games it has no natural pacing floor — a player can
// replay it back-to-back at tap speed. The old flat 50/75/100 paid Easy
// (~30s/round) far more per minute than Hard (~3min/round), the opposite of
// what a difficulty curve should do, and outpaced every AI-gated game's
// coins/minute by 2-3x, making Memory the fastest way to farm the whole
// cosmetic catalog. Rescaled to 25/50/100 (1x/2x/4x by difficulty) so the
// per-minute rate now falls in the same ~30-50/min range as the other games,
// declining with difficulty like they do, instead of leading the pack.
const MEMORY_REWARDS = { easy: 25, medium: 50, hard: 100 };

export function getMemoryReward(difficulty) {
  return MEMORY_REWARDS[difficulty] || 0;
}

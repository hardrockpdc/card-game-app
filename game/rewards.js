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

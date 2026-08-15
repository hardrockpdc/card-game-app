// Per-game roster limits for online multiplayer, plus the check that decides
// whether a lobby may start.
//
// This lived inline in OnlineLobbyScreen as a GAME_INFO table plus a
// hand-written `count < min` test. That test never checked the UPPER bound,
// even though the table declared one and the UI rendered "players/max" — so a
// lobby could start a 6-player Go Fish (max 4) and exhaust the deck on the
// deal. joinRoom had no cap either.
//
// Pulled out here so the rule is pure and testable, and so the screen and any
// future join-side guard share one source of truth.

export const GAME_INFO = {
  goFish: { label: "Go Fish", min: 2, max: 4, screen: "GoFishGame" },
  conquian: { label: "Conquián", min: 2, max: 4, screen: "ConquianGame" },
  poker: { label: "Poker", min: 2, max: 5, screen: "PokerGame" },
  rummy: { label: "Rummy", min: 2, max: 4, screen: "RummyGame" },
  lastCard: { label: "Last Card", min: 2, max: 8, screen: "LastCardGame" },
  whoami: { label: "Who Am I?", min: 2, max: 8, screen: "WhoAmIGame" },
};

// Fallbacks for an unrecognised gameId. Deliberately conservative: an unknown
// game gets the tightest limits rather than none at all.
const FALLBACK = { label: "Game", min: 2, max: 4 };

export function getGameInfo(gameId) {
  return GAME_INFO[gameId] || FALLBACK;
}

// True if the room is already at capacity, so a further join must be refused.
export function isRoomFull(gameId, playerCount) {
  return playerCount >= getGameInfo(gameId).max;
}

// Whether the host may start, and if not, why. Returns:
//   { ok: true }
//   { ok: false, reason: "too-few" | "too-many", title, message }
// The screen renders title/message straight into an Alert.
export function canStartGame(gameId, playerCount) {
  const info = getGameInfo(gameId);

  if (playerCount < info.min) {
    return {
      ok: false,
      reason: "too-few",
      title: "Not enough players",
      message: `${info.label} needs at least ${info.min} players.`,
    };
  }

  if (playerCount > info.max) {
    return {
      ok: false,
      reason: "too-many",
      title: "Too many players",
      message: `${info.label} supports at most ${info.max} players. Ask someone to leave before starting.`,
    };
  }

  return { ok: true };
}

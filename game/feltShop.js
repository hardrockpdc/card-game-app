import { LAST_CARD_TABLES } from "./lastCardTheme";

// Coin-unlock helpers for table felts, mirroring game/cardTheme.js's deck
// helpers. Felts are the shared palette list (see lastCardTheme.js); the free
// starters have price 0. Unlocks are GLOBAL — buy a felt once and it's usable in
// every game.

export function getFeltPrice(id) {
  const felt = LAST_CARD_TABLES.find((t) => t.id === id);
  return felt?.price ?? 0;
}

// A felt is available if it's free (price 0) or the player owns it. `activeId`
// grandfathers whatever felt the game is currently showing, so nobody can get
// stuck on a felt they somehow have selected but don't "own".
export function isFeltUnlocked(id, unlockedFelts, activeId) {
  return (
    getFeltPrice(id) === 0 ||
    (Array.isArray(unlockedFelts) && unlockedFelts.includes(id)) ||
    id === activeId
  );
}

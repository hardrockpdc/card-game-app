// M3 — the online lobby enforced only a MINIMUM player count.
//
// OnlineLobbyScreen's handleStart checked `count < info.min` and nothing else,
// even though GAME_INFO declared a max for every game and the UI rendered
// "players/max". joinRoom had no cap either, and the database rule let any
// authenticated uid create a player slot. So six players could pile into a
// 4-player Go Fish and the host could start, exhausting the deck on the deal.
import {
  GAME_INFO,
  getGameInfo,
  isRoomFull,
  canStartGame,
} from "../game/roomRoster";

describe("game limits table", () => {
  test("every game declares a coherent min/max", () => {
    for (const [id, info] of Object.entries(GAME_INFO)) {
      expect(info.min).toBeGreaterThanOrEqual(2);
      expect(info.max).toBeGreaterThanOrEqual(info.min);
      expect(typeof info.label).toBe("string");
      expect(typeof info.screen).toBe("string");
      expect(id).toBeTruthy();
    }
  });

  test("an unknown gameId falls back to conservative limits, not none", () => {
    const info = getGameInfo("not-a-game");
    expect(info.min).toBe(2);
    expect(info.max).toBe(4);
  });
});

describe("M3 — the upper bound is enforced", () => {
  test("Go Fish rejects a start with more than 4 players", () => {
    const r = canStartGame("goFish", 6);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too-many");
    expect(r.message).toContain("4");
  });

  test("Poker rejects 6 but allows 5", () => {
    expect(canStartGame("poker", 6).ok).toBe(false);
    expect(canStartGame("poker", 5).ok).toBe(true);
  });

  test("exactly at max is allowed", () => {
    for (const [id, info] of Object.entries(GAME_INFO)) {
      expect(canStartGame(id, info.max).ok).toBe(true);
    }
  });

  test("one over max is refused for every game", () => {
    for (const [id, info] of Object.entries(GAME_INFO)) {
      const r = canStartGame(id, info.max + 1);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("too-many");
    }
  });

  test("isRoomFull gates the join side at capacity", () => {
    expect(isRoomFull("goFish", 3)).toBe(false);
    expect(isRoomFull("goFish", 4)).toBe(true);
    expect(isRoomFull("lastCard", 7)).toBe(false);
    expect(isRoomFull("lastCard", 8)).toBe(true);
  });
});

describe("the existing minimum check still works", () => {
  test("below min is refused with the original wording", () => {
    const r = canStartGame("goFish", 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too-few");
    expect(r.message).toContain("at least 2");
  });

  test("exactly at min is allowed", () => {
    for (const [id, info] of Object.entries(GAME_INFO)) {
      expect(canStartGame(id, info.min).ok).toBe(true);
    }
  });
});

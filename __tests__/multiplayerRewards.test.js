// Multiplayer wins paid nothing in four of the six multiplayer games.
//
// Last Card, Go Fish, Conquián and Rummy each opened their reward effect with
//
//     if (!isSinglePlayer) return;
//
// so addCoins, recordWin and recordAchievementEvent never ran in local or
// online multiplayer — while the very next line already asked getWinReward for
// the multiplayer tier. The higher payout was computed and thrown away.
//
// Two of the three co-equal audiences this app is built for (family in one
// room, friends who are apart) were locked out of the entire coin economy:
// no coins, no rank movement, no achievement progress, and — because the
// win/lose haptic sat inside the same effect — not even a buzz.
//
// The screens need a React renderer this Jest config deliberately doesn't have
// (node env, no JSX transform), so what is pinned here is the reward table
// those screens read, plus the invariant that made the bug expensive: for every
// game that supports both modes, multiplayer must pay strictly more than solo.
import { getWinReward } from "../game/rewards";

const BOTH_MODES = ["gofish", "lastcard", "conquian", "rummy", "poker"];

describe("multiplayer reward tiers are real and reachable", () => {
  test.each(BOTH_MODES)(
    "%s pays strictly more for a multiplayer win",
    (gameId) => {
      const solo = getWinReward(gameId, false);
      const multi = getWinReward(gameId, true);

      expect(solo).toBeGreaterThan(0);
      expect(multi).toBeGreaterThan(solo);
    },
  );

  test("the multiplayer premium is the documented 2-2.5x, not a rounding error", () => {
    // If a future edit flattens the tiers, the screens would still "work" while
    // silently removing the reason multiplayer is worth playing.
    for (const gameId of BOTH_MODES) {
      const ratio = getWinReward(gameId, true) / getWinReward(gameId, false);
      expect(ratio).toBeGreaterThanOrEqual(2);
      expect(ratio).toBeLessThanOrEqual(2.5);
    }
  });
});

describe("single-mode games stay single-mode", () => {
  test("solitaire has no multiplayer tier", () => {
    expect(getWinReward("solitaire", false)).toBe(150);
    expect(getWinReward("solitaire", true)).toBe(0);
  });

  test("who am i? is multiplayer-only", () => {
    expect(getWinReward("whoami", true)).toBe(300);
    expect(getWinReward("whoami", false)).toBe(0);
  });

  test("an unknown game pays nothing rather than throwing", () => {
    expect(getWinReward("nope", true)).toBe(0);
    expect(getWinReward(undefined, false)).toBe(0);
  });
});

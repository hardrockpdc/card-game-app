import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDailyStatus,
  claimDailyBonus,
  getBestStreak,
  DAILY_REWARDS,
} from "../game/dailyBonus";
import { getCoins, setCoins, getLifetimeEarned } from "../game/wallet";

beforeEach(async () => {
  await AsyncStorage.clear();
});

const d = (str) => new Date(str + "T12:00:00");

describe("getDailyStatus", () => {
  test("first-ever check is claimable as Day 1", async () => {
    const s = await getDailyStatus(d("2026-07-03"));
    expect(s.canClaim).toBe(true);
    expect(s.claimDay).toBe(1);
  });
});

describe("claimDailyBonus", () => {
  test("Day 1 pays 100 and blocks a second claim same day", async () => {
    await setCoins(1000);
    const r = await claimDailyBonus(d("2026-07-03"));
    expect(r.claimed).toBe(true);
    expect(r.day).toBe(1);
    expect(r.amount).toBe(DAILY_REWARDS[0]);
    expect(await getCoins()).toBe(1100);

    const again = await claimDailyBonus(d("2026-07-03"));
    expect(again.claimed).toBe(false);
  });

  test("consecutive days advance the streak", async () => {
    await setCoins(1000);
    await claimDailyBonus(d("2026-07-03")); // day 1
    const r2 = await claimDailyBonus(d("2026-07-04")); // day 2
    expect(r2.day).toBe(2);
    expect(r2.amount).toBe(DAILY_REWARDS[1]);
    expect(r2.consecutive).toBe(2);
  });

  test("a missed day resets to Day 1", async () => {
    await setCoins(1000);
    await claimDailyBonus(d("2026-07-03")); // day 1
    await claimDailyBonus(d("2026-07-04")); // day 2
    const r = await claimDailyBonus(d("2026-07-06")); // skipped the 5th
    expect(r.day).toBe(1);
    expect(r.consecutive).toBe(1);
  });

  test("Day 7 jackpot then loops back to Day 1", async () => {
    await setCoins(0);
    for (let i = 0; i < 7; i++) {
      const day = String(3 + i).padStart(2, "0");
      await claimDailyBonus(d(`2026-07-${day}`));
    }
    // 7-day perfect streak = 2000 total earned.
    expect(await getLifetimeEarned()).toBe(2000);
    // Day 8 loops to Day 1.
    const loop = await claimDailyBonus(d("2026-07-10"));
    expect(loop.day).toBe(1);
  });

  test("best streak tracks the longest consecutive run", async () => {
    await claimDailyBonus(d("2026-07-03"));
    await claimDailyBonus(d("2026-07-04"));
    await claimDailyBonus(d("2026-07-05"));
    // break
    await claimDailyBonus(d("2026-07-08"));
    expect(await getBestStreak()).toBe(3);
  });

  test("consecutive streak keeps climbing PAST day 7 (regression)", async () => {
    // Claim 10 days in a row across the Day-7→Day-1 reward loop. The loyalty
    // counter must not reset when the 1..7 reward cycle loops back.
    for (let i = 0; i < 10; i++) {
      const day = String(3 + i).padStart(2, "0");
      const r = await claimDailyBonus(d(`2026-07-${day}`));
      expect(r.consecutive).toBe(i + 1);
    }
    expect(await getBestStreak()).toBe(10);
  });

  test("a second claim the same day is refused (no double-award)", async () => {
    await setCoins(0);
    const a = await claimDailyBonus(d("2026-07-03"));
    const b = await claimDailyBonus(d("2026-07-03"));
    expect(a.claimed).toBe(true);
    expect(b.claimed).toBe(false);
    expect(await getCoins()).toBe(DAILY_REWARDS[0]); // charged exactly once
  });

  test("days 1-6 total exactly 1000, week totals 2000", () => {
    const week = DAILY_REWARDS.reduce((a, b) => a + b, 0);
    const firstSix = DAILY_REWARDS.slice(0, 6).reduce((a, b) => a + b, 0);
    expect(firstSix).toBe(1000);
    expect(week).toBe(2000);
  });
});

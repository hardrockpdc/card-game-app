import AsyncStorage from "@react-native-async-storage/async-storage";
import { addCoins } from "./wallet";

// Daily login bonus with a 7-day streak. Days 1–6 total exactly 1,000; Day 7 is
// a 1,000 jackpot (equal to the rest of the week combined) → 2,000/week at a
// perfect streak. Miss a day → the streak resets to Day 1. After Day 7 it loops
// back to Day 1. Cosmetic-economy earn side — pure JS, no rebuild.

const KEY_LAST_CLAIM = "@cardnight:daily:last_claim"; // "YYYY-MM-DD" (local)
const KEY_STREAK_DAY = "@cardnight:daily:streak_day"; // 1..7, the last day claimed
const KEY_CONSECUTIVE = "@cardnight:daily:consecutive"; // total consecutive days claimed
const KEY_BEST_STREAK = "@cardnight:daily:best_streak"; // longest run, for achievements

// Day 1..7 rewards.
export const DAILY_REWARDS = [100, 125, 150, 175, 200, 250, 1000];

// Local calendar day as "YYYY-MM-DD" (not UTC — the streak follows the player's
// own midnight, not the server's).
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Whole-day difference between two "YYYY-MM-DD" keys (b - a), calendar-based so
// DST shifts can't produce a fractional day.
function dayDiff(aKey, bKey) {
  const [ay, am, ad] = aKey.split("-").map(Number);
  const [by, bm, bd] = bKey.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}

async function readStreakDay() {
  const raw = await AsyncStorage.getItem(KEY_STREAK_DAY);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 7 ? n : 0;
}

// What the player would see today: whether they can claim, and which day of the
// streak that claim would be (1..7).
export async function getDailyStatus(now = new Date()) {
  try {
    const today = todayKey(now);
    const lastClaim = await AsyncStorage.getItem(KEY_LAST_CLAIM);
    const lastDay = await readStreakDay();

    if (!lastClaim) {
      // Never claimed → today would be Day 1.
      return { canClaim: true, claimDay: 1, streakDay: 0, alreadyClaimedToday: false };
    }

    const gap = dayDiff(lastClaim, today);

    if (gap <= 0) {
      // Already claimed today (gap 0), or clock moved backwards (treat as claimed).
      return {
        canClaim: false,
        claimDay: lastDay || 1,
        streakDay: lastDay,
        alreadyClaimedToday: true,
      };
    }

    if (gap === 1) {
      // Consecutive day → advance, looping 7 → 1.
      const nextDay = lastDay >= 7 ? 1 : lastDay + 1;
      return { canClaim: true, claimDay: nextDay, streakDay: lastDay, alreadyClaimedToday: false };
    }

    // Missed one or more days → streak resets to Day 1.
    return { canClaim: true, claimDay: 1, streakDay: lastDay, alreadyClaimedToday: false };
  } catch {
    return { canClaim: false, claimDay: 1, streakDay: 0, alreadyClaimedToday: false };
  }
}

// Claim today's bonus if available. Returns { claimed, day, amount, newBalance,
// streakDay }. If already claimed today, returns { claimed: false }.
export async function claimDailyBonus(now = new Date()) {
  const status = await getDailyStatus(now);
  if (!status.canClaim) {
    return { claimed: false, day: status.claimDay, amount: 0, streakDay: status.streakDay };
  }

  const day = status.claimDay;
  const amount = DAILY_REWARDS[day - 1] || 0;
  const newBalance = await addCoins(amount);

  const today = todayKey(now);
  await AsyncStorage.setItem(KEY_LAST_CLAIM, today);
  await AsyncStorage.setItem(KEY_STREAK_DAY, String(day));

  // Track total consecutive days (not the 1..7 cycle) for the loyalty
  // achievements (7-day / 30-day login streak). A continuation is a claim on a
  // day other than a fresh Day-1 restart.
  let consecutive = 1;
  try {
    const isContinuation = status.claimDay !== 1;
    if (isContinuation) {
      const prev = parseInt(await AsyncStorage.getItem(KEY_CONSECUTIVE), 10);
      consecutive = (Number.isFinite(prev) && prev >= 0 ? prev : 0) + 1;
    }
    await AsyncStorage.setItem(KEY_CONSECUTIVE, String(consecutive));

    const prevBest = parseInt(await AsyncStorage.getItem(KEY_BEST_STREAK), 10);
    const best = Number.isFinite(prevBest) && prevBest >= 0 ? prevBest : 0;
    if (consecutive > best) {
      await AsyncStorage.setItem(KEY_BEST_STREAK, String(consecutive));
    }
  } catch {
    // Streak tracking is best-effort; never block the coin award.
  }

  return { claimed: true, day, amount, newBalance, streakDay: day, consecutive };
}

export async function getBestStreak() {
  try {
    const n = parseInt(await AsyncStorage.getItem(KEY_BEST_STREAK), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

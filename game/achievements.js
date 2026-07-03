import AsyncStorage from "@react-native-async-storage/async-storage";
import { addCoins } from "./wallet";
import { loadProfile } from "./profile";
import { getBestStreak } from "./dailyBonus";
import { THEMES_LIST, getThemePrice } from "./cardTheme";

// One-time achievements — the last earn-side system. Cosmetic-economy friendly:
// participation / cumulative / solo-skill milestones, avoiding outcome-based ones
// that can be farmed against weak AI or via multiplayer collusion (see
// COIN_ECONOMY.md). Each pays coins ONCE, the first time its condition is met.
//
// Most conditions are derived from data we already persist (profile stats, the
// login streak, cosmetic unlocks). A few need a small event counter that the
// game screens bump — stored here under KEY_EVENTS.

const KEY_EVENTS = "@cardnight:ach:events"; // { onlinePlayed, onlineHosted, mpWins, blackjackDealt }
const KEY_CLAIMED = "@cardnight:ach:claimed"; // JSON array of claimed achievement ids

// The 8 games that count toward "Well-Rounded" (match the recordWin ids).
const ALL_GAME_IDS = [
  "blackjack",
  "solitaire",
  "conquian",
  "rummy",
  "gofish",
  "poker",
  "lastcard",
  "whoami",
];

// Paid card decks, for "Fashionista" (own them all).
const PAID_DECK_IDS = THEMES_LIST.filter(([id]) => getThemePrice(id) > 0).map(
  ([id]) => id,
);

export const ACHIEVEMENTS = [
  // Getting Started
  { id: "welcome", group: "Getting Started", icon: "👋", name: "Welcome!", desc: "Set up your profile (name + photo)", reward: 100, check: (c) => c.profileNameSet && c.profilePhotoSet },
  { id: "first_win", group: "Getting Started", icon: "🥇", name: "First Win", desc: "Win any game", reward: 250, check: (c) => c.totalWins >= 1 },
  { id: "going_live", group: "Getting Started", icon: "🌐", name: "Going Live", desc: "Play your first online game", reward: 250, check: (c) => c.onlinePlayed },
  // Winning (cumulative)
  { id: "hang_of_it", group: "Winning", icon: "🎯", name: "Getting the Hang of It", desc: "Win 10 games total", reward: 500, check: (c) => c.totalWins >= 10 },
  { id: "seasoned", group: "Winning", icon: "🏅", name: "Seasoned Player", desc: "Win 50 games total", reward: 1500, check: (c) => c.totalWins >= 50 },
  { id: "card_master", group: "Winning", icon: "👑", name: "Card Master", desc: "Win 100 games total", reward: 3000, check: (c) => c.totalWins >= 100 },
  { id: "well_rounded", group: "Winning", icon: "🧩", name: "Well-Rounded", desc: "Win every game at least once", reward: 1000, check: (c) => c.allGamesWon },
  // Multiplayer
  { id: "host_most", group: "Multiplayer", icon: "🖧", name: "Host with the Most", desc: "Host your first online game", reward: 250, check: (c) => c.onlineHosted },
  { id: "party_animal", group: "Multiplayer", icon: "🎉", name: "Party Animal", desc: "Win 25 multiplayer games", reward: 1500, check: (c) => c.mpWins >= 25 },
  // Loyalty
  { id: "regular", group: "Loyalty", icon: "📅", name: "Regular", desc: "7-day login streak", reward: 1000, check: (c) => c.bestStreak >= 7 },
  { id: "devoted", group: "Loyalty", icon: "💎", name: "Devoted", desc: "30-day login streak", reward: 3000, check: (c) => c.bestStreak >= 30 },
  // Collector
  { id: "fresh_look", group: "Collector", icon: "✨", name: "Fresh Look", desc: "Unlock your first cosmetic", reward: 250, check: (c) => c.cosmeticsUnlocked >= 1 },
  { id: "fashionista", group: "Collector", icon: "🎨", name: "Fashionista", desc: "Unlock all card decks", reward: 2000, check: (c) => c.allDecksUnlocked },
  // Flair (not farmable)
  { id: "natural", group: "Flair", icon: "🃏", name: "Natural", desc: "Get dealt a blackjack", reward: 250, check: (c) => c.blackjackDealt },
  { id: "clean_sweep", group: "Flair", icon: "🧹", name: "Clean Sweep", desc: "Win a game of Solitaire", reward: 250, check: (c) => (c.winsByGame.solitaire || 0) >= 1 },
];

// ── Event counters (the few facts not derivable from existing data) ──────────
const DEFAULT_EVENTS = {
  onlinePlayed: false,
  onlineHosted: false,
  mpWins: 0,
  blackjackDealt: false,
};

let eventQueue = Promise.resolve();
function enqueue(fn) {
  eventQueue = eventQueue.then(fn, fn);
  return eventQueue;
}

async function readEvents() {
  try {
    const raw = await AsyncStorage.getItem(KEY_EVENTS);
    return raw ? { ...DEFAULT_EVENTS, ...JSON.parse(raw) } : { ...DEFAULT_EVENTS };
  } catch {
    return { ...DEFAULT_EVENTS };
  }
}

export async function getEvents() {
  return readEvents();
}

// Record a game event that feeds an achievement. Types:
//   "onlinePlayed"           – entered an online game
//   "onlineHosted"           – hosted an online game (implies onlinePlayed)
//   "win" { isMultiplayer }  – won a game (bumps the MP win counter if MP)
//   "blackjackDealt"         – was dealt a natural blackjack
export function recordAchievementEvent(type, payload = {}) {
  return enqueue(async () => {
    const events = await readEvents();
    switch (type) {
      case "onlinePlayed":
        events.onlinePlayed = true;
        break;
      case "onlineHosted":
        events.onlineHosted = true;
        events.onlinePlayed = true;
        break;
      case "win":
        if (payload.isMultiplayer) events.mpWins = (events.mpWins || 0) + 1;
        break;
      case "blackjackDealt":
        events.blackjackDealt = true;
        break;
      default:
        return events;
    }
    try {
      await AsyncStorage.setItem(KEY_EVENTS, JSON.stringify(events));
    } catch {
      // best-effort
    }
    return events;
  });
}

// ── Claimed set ──────────────────────────────────────────────────────────────
export async function getClaimed() {
  try {
    const raw = await AsyncStorage.getItem(KEY_CLAIMED);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ── Context + evaluation ─────────────────────────────────────────────────────
async function buildContext() {
  const [profile, bestStreak, events] = await Promise.all([
    loadProfile(),
    getBestStreak(),
    readEvents(),
  ]);

  const stats = profile.stats || {};
  const winsByGame = {};
  let totalWins = 0;
  for (const id of Object.keys(stats)) {
    const w = stats[id]?.wins || 0;
    winsByGame[id] = w;
    totalWins += w;
  }
  const allGamesWon = ALL_GAME_IDS.every((id) => (winsByGame[id] || 0) >= 1);

  const unlockedThemes = profile.unlockedThemes || [];
  const unlockedFelts = profile.unlockedFelts || [];
  const allDecksUnlocked =
    PAID_DECK_IDS.length > 0 &&
    PAID_DECK_IDS.every((id) => unlockedThemes.includes(id));

  return {
    profileNameSet: Boolean(profile.name && profile.name.trim()),
    profilePhotoSet: Boolean(profile.photoType),
    totalWins,
    winsByGame,
    allGamesWon,
    bestStreak,
    cosmeticsUnlocked: unlockedThemes.length + unlockedFelts.length,
    allDecksUnlocked,
    onlinePlayed: events.onlinePlayed,
    onlineHosted: events.onlineHosted,
    mpWins: events.mpWins || 0,
    blackjackDealt: events.blackjackDealt,
  };
}

// List every achievement with its unlocked/claimed status, for the screen.
export async function listAchievements() {
  const [ctx, claimed] = await Promise.all([buildContext(), getClaimed()]);
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    group: a.group,
    icon: a.icon,
    name: a.name,
    desc: a.desc,
    reward: a.reward,
    unlocked: a.check(ctx),
    claimed: claimed.includes(a.id),
  }));
}

// Evaluate all achievements, award coins for any newly-earned (unlocked but not
// yet claimed), persist them as claimed, and return the list of what was just
// awarded so the caller can celebrate. Safe to call often — idempotent once an
// achievement is claimed.
export async function checkAndClaim() {
  const ctx = await buildContext();
  const claimed = await getClaimed();
  const claimedSet = new Set(claimed);

  const newlyClaimed = [];
  for (const a of ACHIEVEMENTS) {
    if (!claimedSet.has(a.id) && a.check(ctx)) {
      await addCoins(a.reward);
      claimedSet.add(a.id);
      newlyClaimed.push({ id: a.id, name: a.name, icon: a.icon, reward: a.reward });
    }
  }

  if (newlyClaimed.length > 0) {
    try {
      await AsyncStorage.setItem(KEY_CLAIMED, JSON.stringify([...claimedSet]));
    } catch {
      // best-effort
    }
  }
  return newlyClaimed;
}

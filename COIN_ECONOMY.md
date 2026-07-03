# Coin Economy Plan (cosmetic-only)

Give the earned coins a purpose. **Cosmetic-only, earned-only** — no real-money
purchase of coins, no pay-to-win, no loot boxes. This keeps the family-friendly
rating intact and never drifts toward the casino/gambling category.

## Principles (the guardrails)
- **Cosmetic only.** Coins buy looks (decks, felts, profile frames), never gameplay
  advantages — especially in multiplayer, where advantages would be unfair.
- **Earned only.** Coins come from playing, not from a credit card. (The planned
  freemium unlock — paying once for online play — stays SEPARATE from coins.)
- **No randomized/paid mechanics.** No loot boxes or spin-to-win. Sell known
  items at known prices.

## The loop
- **Earn:** game wins (already: +500 for some wins), a **daily bonus / streak**,
  and **achievements**.
- **Spend:** unlock **card decks** → then **table felts** → then **profile frames**.

Note: profile pictures themselves are NOT a sink — players already get any
camera-roll photo or a preset emoji avatar for free. Frames (decorative borders
that layer *around* the existing photo/emoji/initial) are the profile cosmetic.

## Economy numbers (starting values — all tunable)

**Starting balance:** 1,000 coins (existing).
**Free decks (never cost coins):** Classic, Neon. All other decks are earned.

### Earn — per win (single-player pays less than multiplayer)
Principle: multiplayer ≈ 2–2.5× single-player, to reward social play and stop
easy coin-farming vs the AI.

| Game | Single-player (vs AI) | Multiplayer |
|------|----------------------|-------------|
| Go Fish, Last Card (quick) | 100 | 250 |
| Conquián, Rummy (medium) | 150 | 350 |
| Poker (longer) | 200 | 500 |
| Solitaire (solo only) | 150 | — |
| Blackjack (solo only) | bet-based (keep existing 2× / 2.5×) | — |
| Who Am I? (multiplayer only) | — | 300 |

*(Current code pays a flat 500 for Go Fish / Last Card / Conquián / Poker — those
get replaced by the values above.)*

### Earn — daily bonus (7-day streak, resets if a day is missed)
| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|-----|---|---|---|---|---|---|---|
| Coins | 100 | 125 | 150 | 175 | 200 | 250 | 1,000 |
Small daily nudges (days 1–6 total exactly 1,000) with a Day-7 jackpot (1,000 —
equal to the whole rest of the week combined) as the streak payoff. Loops back to
Day 1 after Day 7. 2,000/week at a perfect streak. Miss a day → reset to Day 1
(and lose the run at the jackpot).

### Earn — achievements (one-time, ~15,100 total pool)
Avoid outcome-based achievements that can be farmed against weak AI or via
multiplayer collusion (e.g. "win an all-in" was cut for this reason). Prefer
participation, cumulative, and luck/solo-skill milestones.

**Getting Started**
| Welcome! — set up profile (name + avatar) | 100 |
| First Win — win any game | 250 |
| Going Live — play your first online game | 250 |

**Winning (cumulative)**
| Getting the Hang of It — win 10 games total | 500 |
| Seasoned Player — win 50 games total | 1,500 |
| Card Master — win 100 games total | 3,000 |
| Well-Rounded — win every game at least once | 1,000 |

**Multiplayer**
| Host with the Most — host your first online game | 250 |
| Party Animal — win 25 multiplayer games | 1,500 |

**Loyalty**
| Regular — 7-day login streak | 1,000 |
| Devoted — 30-day login streak | 3,000 |

**Collector**
| Fresh Look — unlock your first cosmetic | 250 |
| Fashionista — unlock all card decks | 2,000 |

**Flair (not farmable)**
| Natural — get dealt a blackjack | 250 |
| Clean Sweep — win a Solitaire game | 250 |

Trackability: `recordWin` already logs per-game + total wins. Two need a small
addition — a **multiplayer-specific win counter** (wins aren't tagged solo vs MP
yet) and the **login-streak counter** (the daily-bonus system creates it anyway).

### Costs — card decks (Classic + Neon free)
| Deck | Price |
|------|-------|
| Cowboy | 3,000 |
| Girly | 3,000 |
| Wizards | 3,000 |
| Gothic | 3,000 |
| Pirate | 3,000 |
(Flat 3,000 each. Own-all-decks total: 15,000.)

### Costs — other cosmetics
- **Table felts:** 2,000 each (flat).
- **Profile frames (later):** ~1,000 each. Decorative borders (gold ring, neon
  glow, suit-themed, etc.) rendered around the existing `ProfileAvatar` — works
  the same whether the player uses a photo, an emoji avatar, or their initial.
  Some frames can be **rank-exclusive** (earned by rank, not buyable) for extra
  prestige — see Player Ranks.

### Pacing sanity
- **Day one (solo player):** starts with 2 free decks (Classic, Neon). 1,000
  start + 250 first-win + 100 daily + ~3 solo wins ≈ 1,800 → nearly enough for a
  first felt (2,000) within a day or two. Slower but never locked out (dailies +
  achievements carry solo players).
- **Multiplayer player:** ~2× faster → a deck (3,000) in a few days, full set in
  a few weeks.
- **Ranks:** Card Shark (5,000 lifetime) ≈ ~1 week of regular play.

## Sinks, in build order
1. **Card decks** ← first, best ROI (art already exists: classic, neon, cowboy,
   girly, wizards, gothic, pirate).
2. **Table felt themes** (per-game palettes already exist).
3. **Profile frames** (decorative borders around the profile pic — not the pic
   itself, which is already free).
4. Later: **multiplayer emotes** (send 👍/😂 in online games).

---

## Feature 1 scope — Card deck unlocks (build-ready)

**What exists today:** `game/cardTheme.js` has 7 themes; all are freely
selectable. `game/wallet.js` has `getCoins/subtractCoins/getLifetimeEarned`.
`game/profile.js` stores `cardTheme` + `stats`. No "owned/locked" concept yet.

**Data model:**
- Add `price` to each theme in `cardTheme.js` (e.g. `classic: { ..., price: 0 }`).
  Free-by-default: `classic` + `neon` = 0; other decks = 3,000 each (felts 2,000).
- Add `unlockedThemes: ["classic"]` to the profile (`DEFAULT_PROFILE` +
  `normalizeProfile` — default to the price-0 themes so existing users keep
  access). This is the owned list.

**Unlock flow (all client-side, uses existing wallet):**
1. In the theme picker, locked themes show a price + lock instead of being
   directly selectable.
2. Tapping a locked theme → confirm "Unlock for X coins?" → check
   `getCoins() >= price` → `subtractCoins(price)` → add theme to
   `unlockedThemes` → `updateProfile({ unlockedThemes })`.
3. If not enough coins → friendly "Not enough coins — win more games!" message.
4. Selecting an already-unlocked theme works as it does today.

**Screens touched:**
- `CardThemeScreen.js` (and the in-game `CardThemePicker.js`): show lock/price
  overlay on locked themes; wire the unlock confirm.
- Optionally show the coin balance in the header of the picker.

**Notes:**
- Pure JS — **no native rebuild** needed.
- Grandfathering: default `unlockedThemes` to include any theme a returning user
  already has set as `cardTheme`, so nobody loses their current look.
- Keep prices modest at first so the economy feels rewarding, not grindy.

**Effort:** Small–Moderate. Everything it needs (themes, wallet, profile
persistence) already exists.

---

## Player Ranks (status progression)

A rank ladder players climb by playing — pure status/prestige, no gameplay
advantage (stays fair in multiplayer + family-friendly).

**Key design choice: rank is based on LIFETIME coins earned, not current
balance** — so spending coins on cosmetics never demotes you. Two separate
numbers: current balance = what you spend; lifetime earned = your rank. The
wallet already exposes `getLifetimeEarned()`, so the data is there.

Example ladder (tune numbers freely):

| Rank | Lifetime earned |
|------|-----------------|
| 🃏 Rookie | 0 |
| ♠ Card Shark | 5,000 |
| 🎩 High Roller | 20,000 |
| 👑 Ace | 50,000 |
| 🌟 Legend | 100,000 |

- Show the rank on the **Profile** screen and next to the player's name in the
  **multiplayer lobby** (bragging rights).
- Optional: reaching a new rank **unlocks a rank-exclusive profile frame** (only
  obtainable by hitting that rank, never buyable) — a visible status symbol that
  ties the earn loop to the ranks. Could also gift a deck/felt as a bonus.
- Implementation: a small pure helper `getRank(lifetimeEarned)` returning
  `{ name, icon, threshold, next }`; render it on Profile + Lobby. No new
  persistence needed (derived from `getLifetimeEarned()`). Pure JS, no rebuild.

## Suggested timing
Not part of the current review (v8). Build as **v9**, ideally bundled with the
daily-bonus (the earn side) so the loop ships complete: earn daily → spend on
decks. Table felts and profile frames follow the same pattern once decks are proven.

---

## Build status (v9 in progress)

- ✅ **Card deck unlocks** — `game/cardTheme.js` (prices + `isThemeUnlocked`),
  `game/profile.js` (`unlockedThemes`), `CardThemeScreen.js` + `CardThemePicker.js`
  (unlock flow, locked-deck gating). Free: Classic, Neon. Others 3,000. Pure JS.
- ✅ **Daily bonus** — `game/dailyBonus.js` (7-day streak, 100/125/150/175/200/250
  + 1,000 jackpot; resets on a missed day; tracks consecutive/best streak for the
  loyalty achievements). UI: `components/DailyBonusModal.js`, auto-surfaced from
  `HomeScreen.js` on focus when claimable. Tests in `__tests__/dailyBonus.test.js`.
- ✅ **Player ranks** — `game/ranks.js` (`getRank`/`getRankProgress` off lifetime
  earned). Shown on the Profile wallet card with a progress bar. Tests in
  `__tests__/ranks.test.js`. Still TODO: show rank next to names in the online lobby.
- ✅ **Win-reward standardization** — `game/rewards.js` (`getWinReward(gameId,
  isMultiplayer)`) replaces the flat 500. Wired into Go Fish / Last Card /
  Conquián / Rummy / Poker / Solitaire. Solitaire dropped 250 → 150 to match the
  table. Tests in `__tests__/rewards.test.js`. Notes: MP Poker isn't wired yet
  (win is only detected in the SP branch today); Who Am I? still awards no coins
  (no win-detection hook there yet — would pay MP 300 once added).
- ✅ **Table felts shop** — refactored Rummy + Last Card off their bespoke
  inline pickers onto the shared `components/TableThemePicker.js` (now Go Fish /
  Poker / Rummy / Last Card all use it), then gated once there. Added 3 premium
  felts (Crimson Royale / Royal Purple / Rose Gold) at 2,000 each; the 3 starters
  (Indigo / Green / Teal) stay free. `game/feltShop.js` (`getFeltPrice`/
  `isFeltUnlocked`), `game/lastCardTheme.js` (+`price`, +3 palettes),
  `game/profile.js` (`unlockedFelts`). Unlocks are GLOBAL (own once, use in every
  game). Tests in `__tests__/feltShop.test.js`. Note: the old inline-picker
  StyleSheet entries in RummyGameScreen/LastCardGameScreen were removed (the
  shared picker owns those styles now).
- ✅ **Who Am I? win reward** — wired (MP-only, 300 coins to the winning device,
  once per game; shown in the game-over modal). `WhoAmIGameScreen.js`.
- ⚠️ **MP Poker reward — blocked, bigger than a reward wiring.** MP Poker has NO
  tournament-end handling at all: `tournamentWinner` is only ever set in the
  single-player branch, so in multiplayer the game just stops once players are
  knocked down to <2 (no results screen, no winner broadcast). Awarding coins
  requires first building MP end-game: host detects the last player standing →
  broadcasts a winner → each device rewards its own player if it won → results
  screen keyed on `myPid` instead of the literal `"host"`. Needs 2-device testing
  to a knockout. Deferred pending a decision — this is a feature, not a gap.
- ✅ **Achievements** — all 15 from the design, in `game/achievements.js`
  (`ACHIEVEMENTS`, `checkAndClaim`, `listAchievements`, `recordAchievementEvent`).
  Most conditions derive from existing data (profile stats, login streak, cosmetic
  unlocks); 4 need small event counters that the screens now bump: online-played
  + online-hosted (OnlineLobbyScreen), MP-win counter (all MP win sites), and
  blackjack-dealt (GameScreen). New `screens/AchievementsScreen.js` (trophy room,
  linked from Profile → More). `checkAndClaim()` runs on Home focus — awards coins
  for anything newly earned and pops an "Achievement Unlocked!" alert. Rewards feed
  lifetime earned, so achievements also raise your rank. Tests in
  `__tests__/achievements.test.js`. (Also added a Jest asset-mock so modules that
  require card art are testable — `__mocks__/fileMock.js` + jest moduleNameMapper.)
- ✅ **Profile frames** — the last cosmetic sink. `game/frames.js` (CSS-only
  rings, no image assets: `getFrame`/`getFramePrice`/`isFrameUnlocked`/
  `getFrameRingStyle`). Free "None" + 6 frames (Gold / Neon / Ruby / Emerald /
  Royal / Rose) at 1,000 each. `ProfileAvatar` draws the active ring around any
  avatar type (photo/emoji/initial); `profile.activeFrame` + `unlockedFrames`
  persist it. New `screens/FramesScreen.js` (grid shop previewing frames on your
  own avatar), linked from Profile. Shows on the Home hero avatar + shop preview.
  Frame unlocks also count toward the "Fresh Look" achievement. Tests in
  `__tests__/frames.test.js`. Note: the large photo in the Profile *editor* does
  not show the frame (it's the edit control); rank-exclusive frames were left as a
  future option. Other players' frames aren't transmitted in multiplayer yet.

**Coin economy is now feature-complete on the earn+spend loop.** Remaining
non-economy follow-ups: MP Poker end-game (see the poker note above), and the
Firebase security-rules lockdown before public launch.

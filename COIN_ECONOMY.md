# Coin Economy Plan (cosmetic-only)

Give the earned coins a purpose. **Cosmetic-only, earned-only** — no real-money
purchase of coins, no pay-to-win, no loot boxes. This keeps the family-friendly
rating intact and never drifts toward the casino/gambling category.

## Principles (the guardrails)
- **Cosmetic only.** Coins buy looks (decks, felts, avatars), never gameplay
  advantages — especially in multiplayer, where advantages would be unfair.
- **Earned only.** Coins come from playing, not from a credit card. (The planned
  freemium unlock — paying once for online play — stays SEPARATE from coins.)
- **No randomized/paid mechanics.** No loot boxes or spin-to-win. Sell known
  items at known prices.

## The loop
- **Earn:** game wins (already: +500 for some wins), a **daily bonus / streak**,
  and **achievements**.
- **Spend:** unlock **card decks** → then **table felts** → then **avatars/frames**.

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
| Coins | 100 | 150 | 200 | 300 | 400 | 500 | 750 |
Loops back to Day 1 after Day 7. ~2,400/week at a perfect streak.

### Earn — achievements (one-time)
| Achievement | Reward |
|---|---|
| First win | 250 |
| Win 10 games total | 500 |
| Win 50 games total | 1,500 |
| Win 100 games total | 3,000 |
| Win every game at least once | 1,000 |
| 7-day login streak | 1,000 |

### Costs — card decks (Classic + Neon free)
| Deck | Price |
|------|-------|
| Cowboy | 2,000 |
| Girly | 2,000 |
| Wizards | 2,500 |
| Gothic | 2,500 |
| Pirate | 3,000 |
(Own-all-decks total: 12,000.)

### Costs — other cosmetics
- **Table felts:** ~1,000 each.
- **Avatars / frames (later):** 250–500 each.

### Pacing sanity
- **Day one (solo player):** 1,000 start + 250 first-win + 100 daily + ~3 solo
  wins ≈ 1,800 → can unlock a felt or save toward Cowboy. Slower but never locked
  out (dailies + achievements carry solo players).
- **Multiplayer player:** ~2× faster → full deck set in a couple weeks.
- **Ranks:** Card Shark (5,000 lifetime) ≈ ~1 week of regular play.

## Sinks, in build order
1. **Card decks** ← first, best ROI (art already exists: classic, neon, cowboy,
   girly, wizards, gothic, pirate).
2. **Table felt themes** (per-game palettes already exist).
3. **Premium avatars / profile frames.**
4. Later: **multiplayer emotes** (send 👍/😂 in online games).

---

## Feature 1 scope — Card deck unlocks (build-ready)

**What exists today:** `game/cardTheme.js` has 7 themes; all are freely
selectable. `game/wallet.js` has `getCoins/subtractCoins/getLifetimeEarned`.
`game/profile.js` stores `cardTheme` + `stats`. No "owned/locked" concept yet.

**Data model:**
- Add `price` to each theme in `cardTheme.js` (e.g. `classic: { ..., price: 0 }`).
  Free-by-default: `classic` (and maybe `neon`) = 0; others = e.g. 750–2000 coins.
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
- Optional: reaching a new rank **gifts a free cosmetic** (a deck or felt) as a
  milestone reward — ties the earn/spend loop together.
- Implementation: a small pure helper `getRank(lifetimeEarned)` returning
  `{ name, icon, threshold, next }`; render it on Profile + Lobby. No new
  persistence needed (derived from `getLifetimeEarned()`). Pure JS, no rebuild.

## Suggested timing
Not part of the current review (v8). Build as **v9**, ideally bundled with the
daily-bonus (the earn side) so the loop ships complete: earn daily → spend on
decks. Table felts and avatars follow the same pattern once decks are proven.

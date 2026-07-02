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

## Suggested timing
Not part of the current review (v8). Build as **v9**, ideally bundled with the
daily-bonus (the earn side) so the loop ships complete: earn daily → spend on
decks. Table felts and avatars follow the same pattern once decks are proven.

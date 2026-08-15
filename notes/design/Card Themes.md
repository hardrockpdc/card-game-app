---
verified: 2026-08-15
---

# Card themes

Theme switching is live — tap a theme in Profile → Card Theme and all open games
update instantly. No restart needed. Theme is persisted via AsyncStorage (saved as
part of the profile) — survives app restarts.

| Theme ID | Label   | Asset folder                |
| -------- | ------- | ---------------------------- |
| classic  | Classic | assets/card_images_classic/ |
| neon     | Neon    | assets/cards/               |
| cowboy   | Cowboy  | assets/cards_cowboy/        |
| girly    | Girly   | assets/card_images_girly/   |
| wizards  | Wizards | assets/card_images_hp/      |
| gothic   | Gothic  | assets/card_images_gothic/  |
| pirate   | Pirate  | assets/card_images_pirate/  |

All folders use identical filenames: `{rank}_{suit}.png` (ranks: a 2-10 j q k, suits:
spades hearts diamonds clubs) + `card_back.png`.

**Theme system files:**

- `game/cardTheme.js` — module singleton, 7 themes × 54 images each (52 rank/suit cards
  + back + joker) plus 7 preview images, ~386 static `require()` calls total, confirmed
  current — see [[PERF-1]]. `setTheme`/`getTheme`/`subscribe`/`getCardImage`/
  `getCardBackImage`/`getThemePreviewImage`/`THEMES_LIST` exports. All `require()`
  calls resolve to build-time asset IDs, not runtime loads — the theme count doesn't
  affect startup cost or memory, confirmed in the same verification.
- `game/ThemeContext.js` — React context wrapping `cardTheme.js`; provides `useTheme()`
  hook; single `AppState` subscriber shared across all Card instances (replaces
  per-Card `useEffect` subscribers)
- `components/Card.js` — uses `ThemeContext` via `useTheme()`; wrapped in
  `React.memo`; size calculations memoized with `useMemo`
- `screens/CardThemeScreen.js` — full-screen swiper (FlatList pagingEnabled), Ace of
  Spades preview, dot indicators, "Use This Theme" button. Accent colors here were
  fixed from red to blue with a proper contrast pass — see [[UX-1]].
- `screens/ProfileScreen.js` — "Card Theme" row links to the `CardThemes` route
- `screens/SettingsScreen.js` — plain placeholder ("More settings coming soon"); Card
  Themes row lives on Profile instead

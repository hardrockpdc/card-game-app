---
verified: 2026-08-15
---

# Visual style

- Dark navy background (`#1a1a2e`) on menu screens (Home, Profile, Setup, Variant
  Pickers, Lobby, Stats, About)
- Red/pink accent (`#e94560`) for primary buttons — since 2026-08-02, `game/colors.js`
  splits this into semantic tokens (brand CTA, error, neutral badge, positive banner
  each got their own role); the freed red now marks the "last card" moment specifically
- **Per-game table colors via `game/tableThemes.js`** — each game has its own
  immersive table color + accent color:
  - Blackjack/Poker: forest green `#35654D`, gold accent `#FFD700`
  - Solitaire: casino blue `#01889F`, pale blue accent `#7FB3FF`
  - Rummy/Conquián: crimson `#B22222`, cream accent `#FFE4B5`
  - Go Fish: ocean blue `#0D6E8C`, pale aqua accent `#A8E6FF`
  - Last Card: dark navy `#1a1a2e`, red-pink accent `#e94560`
  - Rummy, Poker, and Go Fish additionally have switchable felt themes (Indigo/Green/
    Teal) via `components/TableThemePicker.js` — each game remembers its own choice
- Cards use PNG image assets — see [[Card Themes]]
- Hidden/face-down card uses each theme's `card_back.png`
- Game screens use a standardized `GameHeader` + `StatsStrip` + ☰ menu pattern across
  all 9 games

---
verified: 2026-08-15
---

# Roadmap

## Shipped (historical)

- **Phase 1:** Setup (Node, VS Code, Git, Expo), project created, Hello World on phone
- **Phase 2:** All screens built, navigation working
- **Phase 3:** Single-player Blackjack
- **Phase 4:** `react-native-tcp-socket` + `expo-network` → `GameNetwork.js` →
  HostSetupScreen (TCP server) → JoinScreen (UDP discovery) → LobbyScreen (live player
  list) → multiplayer Blackjack
- **Phase 4.5:** Multiplayer Go Fish + Texas Hold'em Poker
- **Phase 4.8:** Conquián complete — Initial Card Pass, Priority Chain, Borrowing,
  multiplayer
- **Phase 4.9:** App renamed from "Card Games" to "Card Night"
- **Wild Round Phases A-E:** card data, pure logic, single-player UI, full multiplayer,
  full content — later removed entirely 2026-07-01, see [[BUG-5]]
- **Last Card Phase C:** Full single-player + multiplayer networking
- **Update Phases 1-12:** HomeScreen restructure, MultiplayerMenuScreen, profile system,
  card theme persistence, responsive sizing (`game/responsive.js`), Blackjack split,
  Poker variants, Solitaire (5 variants), Rummy (4 variants), shared variant-picker
  component
- **Month 2 Polish:** production-logging guard (`game/logger.js`), Toast feedback,
  QuitButton → later replaced by GameHeader/GameMenu, sound infrastructure
  (`expo-audio`, see [[CQ-15]] for what actually plays today)
- **Online Multiplayer (Firebase, 2026-06):** play from anywhere via room codes.
  `GameNetwork.js` became a transport façade — see [[GameNetwork]]. Working for Go
  Fish, Last Card, Conquián, Rummy, Who Am I?, Poker. MP Poker's tournament end-game is
  still unimplemented — parked, not a bug, see [[Multiplayer Screen Pattern]].
- **Coin Economy (2026-07-01→03):** full earn+spend loop, cosmetic-only, no real-money
  purchases. See [[Coin Economy]].
- **9th and 10th games:** Who Am I? (2026-06-18→20, still awaiting a real
  multiplayer device test — [[CQ-16]]) and Memory Match (2026-07-03, the only game
  with no save/resume — [[BUG-4]])
- 🔜 **Phase 5: Visual Theme Project** — paused, not resumed as of 2026-08-15
- 🔜 **Phase 6: Publish** — Google Play only now (App Store plans dropped when
  distribution went Android-only, see [[LAUNCH-2]]); v8 approved for closed testing,
  v9/1.1.0 production build still pending, see [[Build and Release]] and [[LAUNCH-3]]

## Future game ideas

*(Merged from `GAME_ROADMAP.md`, 2026-08-15 — that file is now removed, this is the
canonical copy. A living list, not a commitment — a menu to prioritize from. Ship small,
one or two games per build, each tested solo + multiplayer before the next.)*

**Design principles (what makes a game a good fit):**
- **Turn-based.** The multiplayer transport syncs state turn-by-turn (Firebase online +
  local TCP). Turn-based games plug in cleanly; real-time reflex games (Speed, Spit,
  Snap) need high-frequency sync — possible later, more work.
- **Family-friendly, all ages.** No mature content (that's what got Wild Round pulled).
  Keep the Teen-or-lower rating.
- **Reuse what exists.** Lobby, room codes, profiles, table themes, AI patterns, and the
  per-game screen structure are all already built — a new game is logic + screen + AI +
  how-to + tests, wired into the existing infra.
- **Original or public-domain.** Traditional games (Hearts, Dominoes, War) are free to
  use. For anything based on a branded game (UNO, Codenames, Scattergories, Cards
  Against Humanity), use ORIGINAL names + original content — mechanics aren't
  copyrightable, names and card text are.
- **Mix solo + multiplayer.** Solo (vs AI) drives daily engagement; multiplayer drives
  the "play with friends" hook.

Effort: **S** = small, **M** = moderate, **L** = larger.

### A. Trick-taking card games — biggest genre gap (currently none)
- **Hearts** (M) — 4-player classic, "shoot the moon", solo + MP. Top pick — a marquee
  addition that fills the whole missing genre.
- **Spades** (M/L) — trick-taking with partnerships + bidding. Great, but partnerships
  add online complexity.

### B. Easy / kids card games (quick wins, youngest players)
- **War** (S) — 2 players, trivially simple, perfect for little kids.
- **Old Maid** (S) — simple, kid-friendly, complements Go Fish.
- ✅ **Memory / Concentration** (S) — DONE 2026-07-03. Head-to-head MP not built.

### C. Dice games (new category — very family-friendly)
- **Five Dice** (Yahtzee-style) (M) — roll/hold/score; solo + MP. Strong, broad appeal.
  (Original name — "Yahtzee" is trademarked.)
- **Farkle** (M) — push-your-luck dice; solo + MP.
- **Liar's Dice** (M) — bluffing dice game; multiplayer-focused.

### D. Party / no-card games (the Who Am I? lineage — the differentiator)
- **Would You Rather** (S) — prompt + vote; MP; dead simple, big fun.
- **Trivia** (M) — categories, turn-based answering; huge family appeal. Needs a
  question bank.
- **Charades (digital)** (S/M) — describe/act a word, others guess; pass-the-phone or
  MP; a close cousin of Who Am I?.
- **Family Fill-in-the-Blanks** (M) — the Wild Round *mechanic* (judge picks the
  funniest answer) but with 100% clean, family-friendly prompts.
- **Word Spymaster** (M/L) — Codenames-style team word-guessing (original name +
  original word lists).
- **Draw & Guess** (L) — Pictionary-style; needs real-time stroke sync (harder), so
  later.

### E. Light board / abstract (2-player)
- **Four-in-a-Row** (S) — Connect-Four-style; simple 2-player, solo vs AI.
- **Dominoes** (M) — classic family game; turn-based; solo + MP. New category.
- **Checkers** (M) — 2-player abstract; solo vs AI.

### Branding note
Adding dice / party / board games broadens Card Night from "card games" toward a
game-night hub. Who Am I? already set that precedent. The name reads card-first, so
keep card games the backbone and treat party/dice/board games as bonus content. If the
mix ever tilts heavily non-card, revisit whether "Card Night" still fits — not urgent.

### Suggested phasing (illustrative, reorder freely)
- **v9:** Hearts (marquee, fills the trick-taking gap) + one easy kid game (War or Old
  Maid).
- **v10:** a dice game (Five Dice) + an easy party game (Would You Rather).
- **Later:** Dominoes, Trivia, Family Fill-in-the-Blanks, Spades, Word Spymaster,
  Four-in-a-Row, Draw & Guess.

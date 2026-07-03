# Card Night — Game Expansion Roadmap

A living list of future games. Not a commitment — a menu to prioritize from.
Ship small, one or two games per build, each tested (solo + multiplayer) before
the next.

## Design principles (what makes a game a good fit)
- **Turn-based.** The multiplayer transport syncs state turn-by-turn (Firebase
  online + local TCP). Turn-based games plug in cleanly; real-time reflex games
  (Speed, Spit, Snap) need high-frequency sync — possible later, more work.
- **Family-friendly, all ages.** No mature content (that's what got Wild Round
  pulled). Keep the Teen-or-lower rating.
- **Reuse what exists.** Lobby, room codes, profiles, table themes, AI patterns,
  and the per-game screen structure are all already built — a new game is
  logic + screen + AI + how-to + tests, wired into the existing infra.
- **Original or public-domain.** Traditional games (Hearts, Dominoes, War) are
  free to use. For anything based on a branded game (UNO, Codenames,
  Scattergories, Cards Against Humanity), use ORIGINAL names + original content —
  mechanics aren't copyrightable, names and card text are.
- **Mix solo + multiplayer.** Solo (vs AI) drives daily engagement; multiplayer
  drives the "play with friends" hook.

Effort: **S** = small, **M** = moderate, **L** = larger.

---

## A. Trick-taking card games  ← biggest genre gap (we have none)
- **Hearts** (M) — 4-player classic, "shoot the moon", solo + MP. *Top pick — a
  marquee addition that fills the whole missing genre.*
- **Spades** (M/L) — trick-taking with partnerships + bidding. Great, but
  partnerships add online complexity.

## B. Easy / kids card games (quick wins, youngest players)
- **War** (S) — 2 players, trivially simple, perfect for little kids.
- **Old Maid** (S) — simple, kid-friendly, complements Go Fish.
- ✅ **Memory / Concentration** (S) — flip-and-match. **DONE 2026-07-03** (single-player: `game/memory.js` + `screens/MemoryGameScreen.js`, Easy/Medium/Hard). Head-to-head MP not built.

## C. Dice games (new category — very family-friendly)
- **Five Dice** (Yahtzee-style) (M) — roll/hold/score; solo + MP. Strong, broad
  appeal. (Original name — "Yahtzee" is trademarked.)
- **Farkle** (M) — push-your-luck dice; solo + MP.
- **Liar's Dice** (M) — bluffing dice game; multiplayer-focused.

## D. Party / no-card games (the Who Am I? lineage — our differentiator)
- **Would You Rather** (S) — prompt + vote; MP; dead simple, big fun.
- **Trivia** (M) — categories, turn-based answering; huge family appeal. Needs a
  question bank (write original or license a trivia dataset).
- **Charades (digital)** (S/M) — describe/act a word, others guess; pass-the-phone
  or MP; a close cousin of Who Am I?.
- **Family Fill-in-the-Blanks** (M) — the Wild Round *mechanic* (judge picks the
  funniest answer) but with 100% clean, family-friendly prompts. Recovers that
  fun format for Card Night without the adults-only content.
- **Word Spymaster** (M/L) — Codenames-style team word-guessing (original name +
  original word lists). Excellent for groups.
- **Draw & Guess** (L) — Pictionary-style; needs real-time stroke sync (harder),
  so later.

## E. Light board / abstract (2-player)
- **Four-in-a-Row** (S) — Connect-Four-style; simple 2-player, solo vs AI.
- **Dominoes** (M) — classic family game; turn-based; solo + MP. New category.
- **Checkers** (M) — 2-player abstract; solo vs AI.

---

## Branding note
Adding dice / party / board games broadens Card Night from "card games" toward a
**game-night hub**. Who Am I? already set that precedent. The name reads
card-first, so keep card games the backbone and treat party/dice/board games as
bonus content. If the mix ever tilts heavily non-card, revisit whether "Card
Night" still fits — not urgent.

## Suggested phasing (illustrative, reorder freely)
- **v9:** Hearts (marquee, fills the trick-taking gap) + one easy kid game (War
  or Old Maid).
- **v10:** a dice game (Five Dice) + an easy party game (Would You Rather).
- **Later:** Dominoes, Trivia, Family Fill-in-the-Blanks, Spades, Word Spymaster,
  Four-in-a-Row, Draw & Guess.

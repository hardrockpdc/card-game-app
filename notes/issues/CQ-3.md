---
id: CQ-3
type: quality
area: data
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-19
evidence: "resolved without a config.js: game/deck.js now exports SUITS/RANKS as the single source of deck composition and names its blackjack values (FACE_CARD_VALUE/ACE_HIGH_VALUE/ACE_LOW_VALUE/BLACKJACK_TARGET); game/conquian.js imports SUITS from deck.js (duplicate array deleted) and getConfig reads a CONFIG_BY_PLAYER_COUNT table; game/gofish.js names HAND_SIZE_TWO_PLAYER/HAND_SIZE_MULTIPLAYER/CARDS_PER_BOOK and derives TOTAL_BOOKS from RANKS.length; game/lastCard.js names its deck-composition counts and DEFAULT_HAND_SIZE; npm test green 48 suites / 577 tests"
---

## Problem

**CQ-3 — DEFERRED.** "Magic numbers → config.js": no `config.js` exists;
the scope is sprawling and subjective with no crisp target. Low value.

(Checklist-line summary — fuller v2 writeup deleted from the repo.)

## Verified 2026-08-15

Still accurate, nothing changed. No `config.js` or equivalent centralization file exists
anywhere in the repo (only the unrelated `jest.config.js` tooling file matches a
`config.js` search). Magic numbers remain scattered directly in game logic: `game/
gofish.js:7` picks hand size (`7` vs `5`) inline by player count, `game/conquian.js:
143-145` hardcodes `handSize`/`winTarget` per player count inline, `game/deck.js:4-21`
defines suits/ranks as local arrays in the deck module itself.

This reflects the original deferral holding steady, not a regression — nothing was
implemented, and nothing broke. Marked `open` rather than `moot`/`fixed` since the
underlying condition (no `config.js`, magic numbers still present) is technically still
there, but severity stays `low` per the original judgment call, which this check doesn't
contest. Not attempting a fix sketch beyond what the original entry already said — the
scope genuinely is sprawling and subjective, and this was explicitly deemed low-value.
If ever tackled, a minimal first step would be a single `game/rules.js` shared by
`gofish.js`, `conquian.js`, `lastCard.js`, and `deck.js` for rule-specific constants
(hand sizes, win targets, deck composition) rather than one monolithic `config.js`.

## Fixed 2026-08-19

Closed by naming the constants in place rather than by adding the `config.js` the
original ticket asked for. A survey of the repo before the change found only one genuine
cross-file duplicate — `SUITS = ["♠", "♥", "♦", "♣"]` defined identically in both
`game/deck.js:4` and `game/conquian.js:20`. `game/poker.js:1` and `game/solitaire.js:1`
define word-form suits (`"hearts"`, …) against their own symbol maps, a different card
representation, and `game/ranks.js`'s `RANKS` is the achievement-tier list, not card
ranks; neither is a duplicate and neither was touched.

Given that, a new `game/rules.js` (the shape this ticket's own 2026-08-15 sketch
proposed) would have become a *second* module owning deck composition alongside
`deck.js` — the same parallel-source-of-truth failure [[CQ-2]] documents, where
`game/roomRoster.js` "replaced inline logic" and became a fourth parallel game list.
`deck.js` already owns the standard 52-card deck, so it became the single source instead:

- `game/deck.js` — `SUITS` and `RANKS` are now exported. Blackjack scoring reads through
  `FACE_RANKS`, `FACE_CARD_VALUE`, `ACE_HIGH_VALUE`, `ACE_LOW_VALUE`, `BLACKJACK_TARGET`;
  the ace demotion is now `ACE_HIGH_VALUE - ACE_LOW_VALUE` rather than a bare `10` that
  happened to match the unrelated face-card `10`.
- `game/conquian.js` — local `SUITS` array deleted, imported from `deck.js`. `getConfig`
  reads a `CONFIG_BY_PLAYER_COUNT` table with a `CONFIG_DEFAULT` fallback and returns a
  copy, so callers can't mutate the shared table.
- `game/gofish.js` — `HAND_SIZE_TWO_PLAYER`, `HAND_SIZE_MULTIPLAYER`, `CARDS_PER_BOOK`,
  and `TOTAL_BOOKS` (derived from `RANKS.length`, so the old hardcoded `13` can no longer
  drift from the deck).
- `game/lastCard.js` — `HIGHEST_NUMBER_CARD`, `COPIES_PER_NUMBER_CARD`,
  `COPIES_PER_ACTION_CARD`, `COPIES_PER_WILD_TYPE`, `DEFAULT_HAND_SIZE`. Card ids and
  their order are unchanged.

Deliberately not done: the general magic-number sweep across screens and UI code. That is
the sprawling, subjective scope this ticket deferred twice, and nothing in the survey
suggested it has become more valuable. `game/rummy.js` already keeps its hand sizes in a
per-variant config table and was left alone.

Verification is `npm test` (48 suites, 577 tests, green before and after) — every file
touched is covered by `__tests__/`. No device test applies; this change is behaviour-
preserving and has no UI surface.


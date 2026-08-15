---
id: CQ-4
type: quality
area: multiplayer
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "game/deck.js:51 exports calculateHandValue; screens/GameScreen.js:13 imports and uses it; no MultiplayerGameScreen.js anywhere in the repo (independently reconfirmed); commit 5ff6676 removal corroborated in git log"
---

## Problem

**CQ-4 — MOOT (2026-06-18).** Multiplayer Blackjack was removed this
session (`5ff6676`), so there's no MP Blackjack logic left to extract.
Single-player Blackjack (`GameScreen.js`) uses `calculateHandValue` from
`game/deck.js`, which is already in the logic layer.

(Checklist-line summary — fuller v2 writeup, describing what refactor was originally
being asked for before it went moot, was deleted from the repo. The original ask itself
could not be reconstructed; only the moot-ing conclusion was re-verified.)

## Verified 2026-08-15

The moot-ing reasoning holds up on independent re-check. `screens/MultiplayerGameScreen.js`
still doesn't exist anywhere in the repo (confirmed via `find`, independent of the
[[BUG-1]] verification pass); commit `5ff6676` ("cleanup: remove orphaned multiplayer
Blackjack screen") is present in git history. `game/deck.js:51` still exports
`calculateHandValue`, and `screens/GameScreen.js:13` still imports and actively uses it
throughout single-player Blackjack's deal/hit/split/dealer-turn logic — the hand-value
logic is already isolated in the logic layer as claimed. No fix needed.

---
id: CQ-3
type: quality
area: data
status: open
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "no config.js/constants module anywhere in the repo; game/gofish.js:7 (hand size inline), game/conquian.js:143-145 (handSize/winTarget inline), game/deck.js:4-21 (suit/rank arrays inline) -- deferral reasoning still holds, nothing changed"
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

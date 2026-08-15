---
id: CQ-8
type: quality
area: multiplayer
status: open
severity: medium
opened: 2026-05-17
verified: 2026-08-15
evidence: "144-150 String(id)-style comparison sites today (was ~160, same ballpark) across 12 files, plus ~96 raw unwrapped .id === comparisons; game/GameNetwork.js:41,60-61,71 assigns clientId as a plain incrementing integer; LobbyScreen.js:287,290 compares/assigns raw clientId while GoFishGameScreen.js mixes a String()-normalized comparison (line 242) with a raw pass-through in the next handler call (line 246)"
---

## Problem

**CQ-8 — DEFERRED.** Standardize `String(id)` vs raw-id comparisons: ~160
comparison sites across game logic **and** multiplayer, where ids are
deliberately mixed types (numeric `clientId` vs string player id). Blind
normalization is high-risk (could break turn/seat matching) and needs
two-device testing. Not safe to ship untested.

(Checklist-line summary — fuller v2 writeup deleted from the repo. Restated once more
elsewhere in the archive as a "carry-forward" note; same ticket, no new information.)

## Verified 2026-08-15

Still open, and the scale is essentially unchanged. `144-150` `String(id)`-style
comparison sites found today across 12 files (Poker 31, Conquián 25, `game/lastCard.js`
19, LastCard screen 15, `game/gofish.js` 15, WhoAmI 14, `game/conquian.js` 9, GoFish 7,
Rummy 3, `game/whoami.js` 3, LobbyScreen 2, `game/onlineRoom.js` 1) — same order of
magnitude as the original ~160 estimate, not stale/shrunk. An additional ~96 raw
(non-`String()`-wrapped) `.id ===` comparisons exist in the same directories, so the
total comparison surface is at least as large once those are counted.

The core hazard is structurally unchanged: `game/GameNetwork.js:41,60-61,71` assigns
`clientId` as a plain incrementing integer and broadcasts it as-is over the wire. Six of
seven multiplayer game screens (Poker, LastCard, WhoAmI, Conquián, Rummy, Go Fish) each
independently re-implement `String(p.id) === String(clientId)` to bridge it against
player ids that appear to be strings elsewhere — the same pattern copy-pasted six times
rather than centralized.

Normalization is inconsistent, exactly as the ticket predicted: `LobbyScreen.js:287,290`
compares/assigns the raw numeric `clientId` without `String()`, and `GoFishGameScreen.js`
mixes a `String()`-normalized comparison (line 242) with a raw-`clientId` pass-through in
the very next handler call (line 246) — inconsistent normalization within a single
handler. This is consistent with the "high-risk, needs two-device testing" framing: a
blind global normalization pass would touch call sites with genuinely different current
behavior.

## Fix sketch

Introduce a single `idsMatch(a, b)` (or `normalizeId(x)`) helper in a shared module
(`game/GameNetwork.js` or a new `game/ids.js`), replace the six duplicated
`String(p.id) === String(clientId)` call sites with it, and audit the raw comparisons
(`LobbyScreen.js:287/290`, `GoFishGameScreen.js:246`) to decide whether they should also
normalize — then two-device-test each affected game for turn/seat matching regressions
before shipping, matching the original ticket's caution. Not attempted here; this is a
re-verification pass, not a fix pass.

---
id: CQ-2
type: quality
area: ui
status: partial
severity: medium
opened: 2026-05-17
verified: 2026-08-15
evidence: "GoFishGameScreen.js:405 now passes gameId:\"goFish\" (fixed, matches HowToPlayScreen.js:19's id:\"goFish\") -- the confirmed content-mismatch bug is closed; 5 parallel game lists still exist (LobbyScreen.js:36-91, MultiplayerGamePickerScreen.js:19-26, game/roomRoster.js:13-20, HowToPlayScreen.js:17-25, SinglePlayerSetupScreen.js:15-72), and HowToPlayScreen.js's GAMES roster still lacks whoami/memory entries -- fix sketch item 2 not done, full centralization still deliberately deferred"
---

## Problem

**CQ-2 — DEFERRED.** "Centralize game registry": the three lists
(`LobbyScreen` = 6 multiplayer games, `HowToPlayScreen` = all 7,
`SinglePlayerSetupScreen` = single-player set) are genuinely **different sets
with different fields**, and ids are inconsistently cased (`goFish`/`wildRound`
vs `gofish`/`wildround`). A naive merge risks changing what appears where and
breaking nav/matching. Reconciling the casing first would be the valuable part,
but it's risky to do blind. Low value for a solo shipper.

(Checklist-line summary — fuller v2 writeup deleted from the repo.)

## Verified 2026-08-15

The status quo has quietly gotten worse since this was filed, and the casing risk it
warned about is no longer theoretical — it's a confirmed, reproducible bug.

**Five parallel lists now, not three.** `LobbyScreen.js:36-91` (`GAMES`, 6 entries: id,
label, screen, available, hasAI, minPlayers, maxPlayers), `MultiplayerGamePickerScreen.js:
19-26` (`GAMES`, same 6 ids, different fields: id, label, accent, suit, emoji),
`game/roomRoster.js:13-20` (`GAME_INFO`, same 6 ids again, different fields: label, min,
max, screen — this file didn't exist when CQ-2 was filed; its own comment says it
replaces logic that "lived inline in `OnlineLobbyScreen`," meaning the refactor that
pulled that table out created a *fourth* parallel list instead of reusing an existing
one), `HowToPlayScreen.js:17-25` (`GAMES`, 7 entries, note `lastcard` spelled differently
— all-lowercase — than everywhere else's `lastCard`), `SinglePlayerSetupScreen.js:15-72`
(`GAMES`, 8 entries). Wild Round is confirmed fully gone (no `wildround`/`wildRound`
identifiers remain anywhere except a stale comment in `jest.setup.js`), so that specific
pairing from the old note is moot — but the general casing problem it was an example of
is not.

**`HowToPlayScreen.js`'s roster is stale.** It covers 7 of the app's 9 games — Who Am I?
and Memory Match were added to the roster since (per `CLAUDE.md`) but never added here,
and neither `WhoAmIGameScreen.js` nor `MemoryGameScreen.js` has a `howto` menu item
pointing at it. Exactly the drift non-centralization predicts: adding a game means
remembering to touch N separate lists, and two were missed.

**The casing inconsistency is now a live, confirmed bug for Go Fish's in-game "How to
Play" link.** `GoFishGameScreen.js:405` passes `{ type: "howto", gameId: "gofish" }`
(all-lowercase) to the menu; `GameMenu.js:180` navigates to `HowToPlay` with that same
`gameId`; `HowToPlayScreen.js:724-727` does `GAMES.find((g) => g.id === gameId) ??
GAMES[0]` — but `GAMES` uses `id: "goFish"` (camelCase), so `"gofish"` never matches and
`selectedGame` silently falls back to `GAMES[0]`, which is **Blackjack**. Meanwhile
`activeGoalAndSteps` (lines 752-923) does its own case-sensitive check, also fails to
match `"goFish"`, and falls through to the final `// lastcard (also the default
fallback)` branch. **Net effect: tapping "How to Play" from inside a live Go Fish game
shows a Blackjack-branded header with Last Card's rules text — neither of which is Go
Fish.** This is the mechanical, confirmed consequence of the exact casing split the old
note warned about — a wrong-content bug, not a merge-risk hypothetical.

The root cause is a genuine two-convention split across the codebase: lowercase
`gofish`/`lastcard` is used in `GameHeader.js`, `game/achievements.js`,
`game/tableThemes.js`, `game/rewards.js`, `screens/StatsScreen.js`, and AsyncStorage keys
(`@cardnight:save:gofish`), while the four `GAMES`-style navigation/roster lists use
camelCase `goFish`/`lastCard` — except `HowToPlayScreen.js` itself, which uses `lastcard`
lowercase, inconsistent even with its own sibling lists. Last Card's own link
(`LastCardGameScreen.js:1138` passes `gameId: "lastcard"`) happens to match
`HowToPlayScreen.js`'s internal id by coincidence, so it works — but disagrees with the
`lastCard` casing used everywhere else.

The deferral decision on full centralization still stands — the fields really do differ
per screen's needs, and a naive merge is still risky. But this should not be re-filed as
"deferred, low value" without at least fixing the concrete Go Fish bug.

## Fixed 2026-08-15

`screens/GoFishGameScreen.js:405` changed `gameId: "gofish"` to `gameId: "goFish"`.
Go Fish's in-game "How to Play" now correctly resolves to `HowToPlayScreen.js`'s
`goFish` entry instead of silently falling back to Blackjack's header with Last
Card's rules text.

## Fix sketch (remaining)

1. Add `whoami` and `memory` entries to `HowToPlayScreen.js`'s `GAMES` (plus goal/steps
   content and `howto` menu items on `WhoAmIGameScreen.js`/`MemoryGameScreen.js`) so all
   9 games have a working How-to-Play entry.

Full centralization of the 5 lists remains a separate, larger, genuinely-deferrable
decision.

---
id: CQ-1
type: quality
area: multiplayer
status: open
severity: medium
opened: 2026-05-17
verified: 2026-08-15
evidence: "ConquianGameScreen.js:293-312, PokerGameScreen.js:661-682, RummyGameScreen.js:459-478, GoFishGameScreen.js:135-142, LastCardGameScreen.js:398-422 each independently define applyState/broadcastState; zero repo hits for useMultiplayerGame; game/GameNetwork.js is shared transport plumbing, not the higher-level state-application logic this ticket is about"
---

## Problem

**CQ-1 — DEFERRED.** Extract `useMultiplayerGame` hook. Big refactor of
shared multiplayer state; un-verifiable without two devices. High risk.

(This is a checklist-line summary — the fuller v2 writeup with the original detailed
reasoning was deleted from the repo along with the rest of `DEEP_REVIEW_v2_archive.md`;
this terse line is all that survives.)

## Verified 2026-08-15

Still accurate. No `useMultiplayerGame` hook exists anywhere in the repo (zero grep hits).
All 5 current multiplayer game screens — Conquián (`ConquianGameScreen.js:293-312`),
Poker (`:661-682`), Rummy (`:459-478`), Go Fish (`:135-142`), Last Card (`:398-422`) —
independently implement nearly identical `applyState`/`broadcastState` logic: mutate a
full-state ref, derive a public view, `setGameState`, broadcast `GAME_STATE` plus a
per-client private-hand message, call `scheduleAI`. `game/GameNetwork.js` is genuinely
shared, but it's low-level transport (`broadcastToClients`, `sendToClient`,
`setServerListeners`) — the higher-level "apply state / am I host / when to broadcast"
layer this ticket is about remains duplicated per screen.

Two narrower hooks have been extracted since this was filed — `useMultiplayerAvatars`
(avatar sync only) and `useOnlineReconnect` (drop/pause/reconnect overlay, currently only
adopted by Last Card, per `CLAUDE.md`'s "Next: adopt the hook in Go Fish/Conquián/Rummy/
Poker/Who Am I?") — but neither touches the core game-state-application logic this ticket
describes.

`DEFERRED` remains the right call: this is a genuine multi-file refactor across 5 screens,
and correctness of a shared hook can't be confidently verified without a live 2-device
session per game. No fix attempted here, consistent with the original reasoning.

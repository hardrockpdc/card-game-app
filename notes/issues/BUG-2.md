---
id: BUG-2
type: bug
area: ui
status: fixed
severity: high
opened: 2026-05-17
verified: 2026-08-14
evidence: "All 9 current game screens checked line-by-line — every one either has no component-level early return (Solitaire, Last Card, Who Am I?, Memory Match) or places every hook above its early return (GameScreen.js:604, ConquianGameScreen.js:1100, RummyGameScreen.js:896, GoFishGameScreen.js:427, PokerGameScreen.js:908). No hook-order fix commits exist anywhere after 2026-06-01."
---

## Problem

## BUG-2. UX-5 BackHandler useEffects placed AFTER early returns in some game screens

> **✅ RESOLVED 2026-06-01.** Full hooks-order audit run across all 9 game screens
> (KICKOFF Task 0.5). Result: only `WildRoundGameScreen` had a misplaced hook — its
> UX-5 BackHandler `useEffect` sat *after* the `if (!gameState)` loading guard, which
> crashes on entry because `gameState` starts null and is filled in async. Moved the
> effect above the guard (commit `9bd069a`). Every other game screen — Conquián, Rummy,
> Go Fish, Poker, Multiplayer Blackjack, single-player Blackjack — places all hooks above
> all early returns. Solitaire and Last Card have no null-state early return at all, so
> they're structurally immune. The remaining detail below is kept for historical context.

**Effort:** 30 minutes total (audit + fixes)
**Risk if ignored:** Same crash pattern that hit Poker recently — "Rendered more hooks than during the previous render"

### What's happening

When we did the UX-5 BackHandler sweep in DEEP_REVIEW v2 (Polish Bundle), the useEffect was added to many game screens. Several of those screens have a `loading` / `gameState === null` early return. Looking at the actual code now:

- **PokerGameScreen.js** — fixed last week, comment "must be before early returns" confirms it ✅
- **RummyGameScreen.js** — `hasMountedRef` useEffect placed after the network listener block. **Need to verify the UX-5 BackHandler useEffect placement.**
- **ConquianGameScreen.js** — `hasMountedRef` is before any early return ✅. Need to verify UX-5.
- **GoFishGameScreen.js** — similar pattern, need to verify UX-5.
- **LastCardGameScreen.js** — its main useEffect (`init`) does early-return `if (!isHost) return`. Need to verify UX-5 placement.
- **WildRoundGameScreen.js** — need to verify UX-5.
- **GameScreen.js** (single-player Blackjack) — the UX-5 useEffect is placed before the early `if (screenPhase === "betting") return ...`. **Actually wait** — looking again, GameScreen's only early return is `if (screenPhase === "betting") return (...)` which is the rendering fork at the bottom of the component, AFTER all useEffects. So GameScreen is safe.
- **MultiplayerGameScreen.js** — same as Conquián, UX-5 is before the loading early return ✅
- **SolitaireGameScreen.js** — UX-5 placement needs verification.
- **LobbyScreen.js** — no early returns for null state, so safe.

### Why this matters

Any screen where the UX-5 useEffect lives after an `if (something) return ...` is a future crash waiting to happen — the same way Poker crashed. The Poker crash already happened to you; the others are dormant.

### The fix

Audit each of the 9 game screens. For each one:

1. Find every `useEffect` in the component
2. Find every `if (...) return ...` early-return statement
3. Confirm EVERY useEffect appears BEFORE EVERY early return

If any useEffect is misplaced, move it up. Same fix we did for Poker.

> Note: This is a pure correctness audit. No new features, no styling changes. The goal is "all hooks before all returns, always." Once done, you've eliminated this whole class of bug across the app.

## Verified 2026-08-14

Re-audited from scratch against today's game roster, not just re-checked the original
claim. The two screens this bug names — `WildRoundGameScreen.js` and
`MultiplayerGameScreen.js` — no longer exist (removed 2026-07-01 and 2026-06-18
respectively, independent of this fix, see [[BUG-1]]). But the roster has also gained
two screens since this bug was filed — `WhoAmIGameScreen.js` and `MemoryGameScreen.js`
— which the original 2026-06-01 audit never saw. Both checked clean (no component-level
early return at all).

Full per-screen result against today's 9-game roster:

| Screen | Early return before render? | Hook-order status |
|---|---|---|
| GameScreen.js (Blackjack) | yes, line 604 | clean — all hooks above it |
| SolitaireGameScreen.js | none | structurally immune |
| ConquianGameScreen.js | yes, line 1100 | clean — BackHandler effect (1061-1097) above it |
| RummyGameScreen.js | yes, line 896 | clean — BackHandler effect (359-415) above it |
| GoFishGameScreen.js | yes, line 427 | clean — BackHandler effect (365-392) above it |
| PokerGameScreen.js | yes, line 908 | clean — BackHandler effect (806-834), explicitly commented "must be before early returns" |
| LastCardGameScreen.js | none | structurally immune |
| WhoAmIGameScreen.js | none | structurally immune |
| MemoryGameScreen.js | none | structurally immune |

Also chased down a loose thread: `CLAUDE.md` §2.1 claims this bug class "has bitten this
project at least four times (Poker, Conquián twice, Rummy)" — more recurrences than this
bug's single WildRound fix. Checked whether any of those predate or postdate the
2026-06-01 audit this bug closed on. All four incidents (documented in
`archive/PROJECT_NOTES.md:491-499`) predate 2026-06-01. `git log --since=2026-06-01` on
every game screen, and a project-wide grep for hook/BackHandler/crash-related commit
messages since that date, turn up nothing — the only hook-order commit is `9bd069a`
itself. A second, independent project-wide re-scan on 2026-06-19
(`archive/PROJECT_NOTES.md:1254-1258`) also came back clean.

So the 2026-06-01 resolution holds up, and holds up through the subsequent roster churn.
Genuinely `fixed`, not just an unchallenged old claim.

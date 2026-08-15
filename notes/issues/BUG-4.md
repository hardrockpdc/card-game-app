---
id: BUG-4
type: bug
area: multiplayer
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-14
evidence: "ConquianGameScreen.js:403-413, RummyGameScreen.js:240/839-843, GoFishGameScreen.js:86/203-207, PokerGameScreen.js:651/719-723, LastCardGameScreen.js:233/365-369 all guard saveGame() with a lastSaveRef 3s throttle; commit 5748463 matches the claimed file list exactly (Rummy, GoFish, Poker, LastCard, 5 lines each)"
---

## Problem

## BUG-4. Auto-save throttle missing in multiple game screens (Conquián already fixed)

**Effort:** 5 minutes
**Risk if ignored:** Battery and performance impact on long games — every meld, every pass, every selection writes to AsyncStorage

### What's happening

**Conquián is already fixed** — `ConquianGameScreen.js` has a `lastSaveRef` 3-second throttle in place (confirmed via code inspection, lines 255-265).

The un-throttled pattern still exists in:
- `RummyGameScreen.js` (auto-save fires on every `gameState` change)
- `GoFishGameScreen.js` (auto-save fires on every `gameState` change)
- `PokerGameScreen.js` (auto-save fires on `[gameState, tournamentWinner]`)
- `LastCardGameScreen.js` (auto-save fires on every `gameState` change)

### Why this matters

Solitaire's PERF-3 fix made it noticeably snappier on Android. The same throttle pattern would benefit the other games. Conquián is the worst offender because of how often the state mutates during meld preview.

### The fix

Apply the same `lastSaveRef` throttle to each game's auto-save effect:

```javascript
const lastSaveRef = useRef(0);

useEffect(() => {
  if (!isSinglePlayer || !fullRef.current) return;
  if (gameState?.phase === "results") {
    clearGame(SAVE_KEY_CONQUIAN);
    return;
  }
  const now = Date.now();
  if (now - lastSaveRef.current < 3000) return;
  lastSaveRef.current = now;
  saveGame(SAVE_KEY_CONQUIAN, { fullState: fullRef.current });
}, [gameState]);
```

Apply to all 5 games. ~5 min per file, all the same pattern.

> Edge case: when a user explicitly hits "Save & Exit", we want a guaranteed save (not throttled). For now this is fine since "Save & Exit" goes through `handleSaveAndExit` which already calls `saveGame` directly, bypassing the throttle's useEffect.

## Verified 2026-08-14

All 5 games named in scope have the throttle, confirmed by reading each auto-save effect
directly (not just the `lastSaveRef` declaration):

| Game | Throttle location |
|---|---|
| Conquián | `ConquianGameScreen.js:403-413` (pre-existing, as the report already noted) |
| Rummy | `RummyGameScreen.js:240` declared, applied `:839-843` inside the effect at `:826-844`, comment reads "BUG-4: throttle to once / 3s" |
| Go Fish | `GoFishGameScreen.js:86` declared, applied `:203-207` inside the effect at `:197-208` |
| Poker | `PokerGameScreen.js:651` declared, applied `:719-723` inside the effect at `:713-724` — matches the original report's specific mention of Poker's extra `tournamentWinner` dependency |
| Last Card | `LastCardGameScreen.js:233` declared, applied `:365-369` inside the effect at `:363-370` |

Commit `5748463` ("fix(saves): throttle auto-save to once / 3s in Rummy, Go Fish, Poker,
Last Card (BUG-4)") touches exactly those 4 files, 5 lines added each, Conquián absent
(consistent with it having been fixed earlier). The archive's claim checks out exactly —
one case where the old doc's confident status line actually holds up.

**Out of BUG-4's scope, checked and not applicable:** the game roster gained two screens
since this bug was filed. `WhoAmIGameScreen.js` has no `saveGame` call anywhere — it's
multiplayer-only (per `CLAUDE.md`), so there's no single-player save surface for a throttle
to apply to. `MemoryGameScreen.js` also has zero `saveGame`/AsyncStorage references — it
has no persistence at all, so there's no unthrottled write to fix either. That's a real
product gap (killing the app mid-game loses all Memory Match progress) but it's a missing
feature, not an unthrottled-write defect, so it does not belong to this ticket. Worth a
separate future note if save/resume for Memory Match is ever wanted.

Verdict is a clean `fixed`, not `partial` — full stated scope covered with matching evidence.

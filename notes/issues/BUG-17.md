---
id: BUG-17
type: bug
area: ui
status: fixed
severity: medium
opened: 2026-09-08
verified: 2026-09-08
evidence: "StatsScreen.js:10-19 GAME_LABELS listed eight games and omitted \"memory\", while MemoryGameScreen.js:44 calls recordWin(\"memory\") and ALL_GAME_IDS in game/achievements.js:20-30 includes it. Stats rendered only the labelled keys, so Memory wins were stored and counted but never shown. Label added; device-verified on emulator-5554 2026-09-08 — Wins by Game now lists nine rows ending in Memory Match"
---

## Problem

**BUG-17. Memory Match wins were recorded but never displayed in Stats.**

Three lists have to agree about which games exist. One didn't:

| Source | Has `memory`? |
|---|---|
| `game/achievements.js:20` `ALL_GAME_IDS` (canonical, nine games) | yes |
| `MemoryGameScreen.js:44` `recordWin("memory")` | yes |
| `StatsScreen.js:10` `GAME_LABELS` (eight) | **no** |

Stats renders from the label map, so the Memory row was silently dropped — no error,
just an absent line among eight that looked complete.

The user-visible consequence is not only a missing row. `ALL_GAME_IDS` drives the
**"Well-Rounded — win every game at least once"** achievement, so a Memory win is
required to earn it, while Stats gave the player no way to see whether they had one.

## Verified/Fixed 2026-09-08

`memory: "Memory Match"` added to `GAME_LABELS`, with a comment noting the map must stay
in step with `ALL_GAME_IDS`. Device-verified: nine rows, Memory Match present.

The two lists are still maintained separately and can drift again. Deriving the Stats
rows from `ALL_GAME_IDS` and keeping only the display strings local would remove the
class of bug; not done here to keep this change to the reported defect.

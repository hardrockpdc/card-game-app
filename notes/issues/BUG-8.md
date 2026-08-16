---
id: BUG-8
type: bug
area: blackjack
status: fixed
severity: low
opened: 2026-08-15
verified: 2026-08-15
evidence: "screens/GameScreen.js:291's clearGame(SAVE_KEY) removed from handleDeal() -- it armed the 2500ms clear-guard in game/gameSaves.js right before the auto-save useEffect's own write landed, so every fresh deal's first save was self-dropped as a 'stray'. Device-log-confirmed via temporary warn() instrumentation (since reverted, kept only the clear-guard-drop warning as permanent diagnostic signal): a hit more than 2.5s after dealing wrote successfully and the resume prompt worked once tested correctly (original 'no prompt' report was a testing miss -- Pedro hadn't actually hit before backing out)"
---

## Problem

Blackjack's mid-hand save/resume doesn't work on-device: leaving via the hardware back
button (which the app explicitly tells the user will save the game) and returning to
Blackjack from the Single Player picker never shows the "Continue Game?" prompt that
`screens/SinglePlayerSetupScreen.js` is supposed to show when `useHasSave` finds a save.

## Verified 2026-08-15

Confirmed on-device, not just a testing mistake: waited past the 2.5s clear-guard window
in `game/gameSaves.js` (`CLEAR_GUARD_MS`) before hitting, so a stray clear-then-resave
race was ruled out as the sole cause. Traced the full chain by reading code —
`screens/GameScreen.js`'s auto-save `useEffect` (fires on every hand-state change once
`screenPhase !== "betting"`), `game/gameSaves.js`'s `saveGame`/`hasSave`, and
`game/useResumePrompt.js`'s `useHasSave` (re-checks on screen focus via
`useFocusEffect`) — nothing in the code read as obviously broken. Pedro separately
confirmed Solitaire's save/resume works correctly on the same device in the same
session, which rules out AsyncStorage itself being broken and narrows this to something
Blackjack-specific.

Pedro also recalled a past request that Blackjack specifically not auto-save — searched
git history (`git log --all -i --grep="blackjack"` filtered for save/resume) and found
no commit that deliberately disabled or gated off Blackjack's resume UI; the
`selectedId === "blackjack"` resume dialog in `SinglePlayerSetupScreen.js` is fully wired
(`blackjackResume`/`blackjackStartNew` handlers, confirm-before-erase dialog added
2026-08-15 per `c6b9d24`). No evidence of an intentional removal — either the memory is
about a different feature, or whatever was requested was never actually implemented this
way.

## Fixed 2026-08-15

Diagnostic `warn()` logging added to `game/gameSaves.js:saveGame` and
`game/useResumePrompt.js:useHasSave` (commit `1287ac4`) surfaced the real chain:
`handleDeal()` called `clearGame(SAVE_KEY)` (arming the guard) immediately before
setting the fresh hand/deck/status state, which the auto-save `useEffect` picks up
within the same tick — landing inside the very guard window that clear had just armed,
so the deal's own first save was dropped as a "stray" every single time. A save only
survived if some *later* state change (e.g. a hit) landed more than 2.5s after the deal.

The device test that originally reported "no resume prompt" turned out to be a testing
miss, not a second bug — Pedro backed out without ever hitting, so no post-guard save
had ever been written. A repeat test (deal → wait 5s → hit → hardware back → confirm
Leave → reopen) showed a successful `saveGame` write and, on a clean single pass, the
"Continue Game?" prompt appearing correctly.

Fix: removed the `clearGame(SAVE_KEY)` call from `handleDeal()` (`screens/GameScreen.js`)
— it was redundant (the immediately-following write fully overwrites the old save via
`AsyncStorage.setItem` regardless) and was the only thing arming the guard that then
blocked that same write. `clearGame` is still called correctly from `handleAdjustBet`,
`handleRestart`, `handleContinueSameBet`, and both Quit/Leave paths, where it's actually
needed (no immediate re-save follows those). The two noisier diagnostic logs (write-
success, every `hasSave` check result) were reverted after use; the clear-guard-drop
warning was kept since a drop is inherently an anomaly worth always surfacing.

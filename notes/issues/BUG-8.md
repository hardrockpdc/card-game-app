---
id: BUG-8
type: bug
area: blackjack
status: open
severity: medium
opened: 2026-08-15
verified: 2026-08-15
evidence: "Device test: dealt a Blackjack hand, waited 5+s (past game/gameSaves.js's 2500ms CLEAR_GUARD_MS), hit once, left via the Android hardware back button (which does not clearGame(), only navigates), reopened Blackjack from the Single Player picker -- no 'Continue Game?' prompt appeared. Solitaire's save/resume confirmed working on the same device the same session, ruling out AsyncStorage itself. Root cause not yet found; added warn() logging to game/gameSaves.js's saveGame() (clear-guard drop + write-success paths) and game/useResumePrompt.js's useHasSave() (checked result) to surface it on next Metro-terminal run"
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

## Fix sketch (remaining, not done)

Instrumented but not yet resolved — added `warn()` calls at the two previously-silent
decision points (`game/gameSaves.js:saveGame` — clear-guard drop and write-success;
`game/useResumePrompt.js:useHasSave` — the checked boolean result) so the next on-device
test with the Metro terminal visible will show which of these is actually happening:

1. `saveGame` never called at all (would mean the auto-save `useEffect` itself isn't
   firing — a hooks/dependency bug in `GameScreen.js`).
2. `saveGame` called but dropped by the clear-guard (would mean the 2.5s window is
   somehow still active despite the 5s wait — a guard-key mismatch or a second
   unaccounted `clearGame(SAVE_KEY)` call).
3. `saveGame` writes OK but `hasSave` still reports `false` (would point at a read-side
   bug — key mismatch, version check, or a timing race with `useFocusEffect`).

Next step: rerun the test with `npx expo start --dev-client`'s terminal visible and
report whichever `[gameSaves]`/`[useHasSave]` lines appear (or don't).

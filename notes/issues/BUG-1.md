---
id: BUG-1
type: bug
area: multiplayer
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-14
evidence: "screens/MultiplayerGameScreen.js does not exist in the working tree; deleted in commit 5ff6676 (2026-06-18, \"cleanup: remove orphaned multiplayer Blackjack screen\"), which also removed its import and Stack.Screen registration from App.js"
---

## Problem

## BUG-1. MultiplayerGameScreen.js still has the OLD layout (Session A code didn't actually land)

**Effort:** 30 minutes (re-run Session A)
**Risk if ignored:** Multiplayer Blackjack screen looks broken / inconsistent with single-player. Doesn't crash, but the visual parity we did in v2's "Session A" is missing.

### What's happening

When we did the "make multiplayer Blackjack look like single-player" work, the project knowledge later showed both Session A code AND Session B (animations) code as committed. Today's resync shows something different: **the styles in `MultiplayerGameScreen.js` are still the OLD ones** — `styles.section`, `styles.sectionActive`, `styles.sectionHeader`, `styles.handRow`, `styles.activeHandBorder`, `styles.actionRow`, etc. These are the styles Session A was supposed to remove.

Specifically, the render still has:

```javascript
<View style={[styles.section, isCurrent && styles.sectionActive]}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionName}>...</Text>
    <Text style={styles.sectionValue}>...</Text>
    ...
```

This is the pre-Session-A code. Session A was supposed to replace this with:

```javascript
<View style={styles.section}>
  <Text style={styles.label}>...</Text>
  <View style={[styles.hand, { width: handWidth }]}>
```

Two reasonable explanations:

1. The Session A commit happened on a different branch and didn't reach main
2. The styling refactor was reverted by a later commit
3. Project knowledge was stale at the time and we never actually confirmed the visual

I see `useWindowDimensions` and `handWidth` ARE present (those were from Session A), so SOME of Session A landed. But the JSX restructure didn't.

### Why this matters

Multiplayer Blackjack visually looks worse than single-player, and you specifically asked for parity. The animations (Session B) DID land — there are `hasMountedRef`, `computePlayerDealDelay`, `computeDealerDealDelay`, and `animateDeal` props on Card. So animations work, but on the old "boxed sections" layout.

### The fix

Re-run the Session A prompt. The prompt is in our chat history (the one titled "refactor: multiplayer Blackjack visual + UX parity with single-player (Session A)"). The Card render structure to add `animateDeal` / `dealDelay` props to is now slightly different from what that prompt expected, since Session B landed first. We'll need a careful Session A re-run that preserves the Session B animation wiring.

Lower-risk path: a single combined prompt that does the Session A JSX refactor AND preserves the existing `hasMountedRef` / `dealDelay` props on the new Card elements.

## Verified 2026-08-14

Timeline reconstructed from git history: Session A really did land, on 2026-05-17
(commit `ce39414`, 161 insertions / 188 deletions in `MultiplayerGameScreen.js` — a
genuine JSX/style refactor, not a stale claim), the same day as Session B's animation
wiring (`61ecb8d`). By 2026-06-02 the tracker's own follow-up correctly marked this
`RESOLVED (verified 2026-06-02)`. No revert of Session A exists anywhere in
`git log --oneline --all --follow -- screens/MultiplayerGameScreen.js`.

But the file the bug is about doesn't exist at all today. Commit `5ff6676` (2026-06-18,
"cleanup: remove orphaned multiplayer Blackjack screen") deleted the ~600-line screen
outright, along with its `App.js` import and `<Stack.Screen name="MultiplayerGame">`
registration, because multiplayer Blackjack was cut as a feature — not merely re-skinned.
Its commit message states nothing navigated to the `MultiplayerGame` route anymore.
Single-player Blackjack (`screens/GameScreen.js`) is unaffected and still exists.
`screens/MultiplayerGamePickerScreen.js`'s current game list (goFish, conquian, poker,
rummy, lastCard, whoami) has no Blackjack entry, and a comment there
(`MultiplayerGamePickerScreen.js:18`) states explicitly: "Solitaire and Blackjack are
single-player only, so they're absent here." `App.js` has zero remaining Blackjack
references. This matches `CLAUDE.md`'s project-facts claim that multiplayer Blackjack
was removed 2026-06-18.

So this is not `fixed` (bug corrected in place) — it's `moot` (the screen the bug
describes no longer exists, superseded by a feature removal). Nothing to do.

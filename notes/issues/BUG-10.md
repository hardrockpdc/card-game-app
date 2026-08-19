---
id: BUG-10
type: bug
area: ui
status: fixed
severity: low
opened: 2026-08-18
verified: 2026-08-18
evidence: "ProfileScreen.js:574-583 back button label now always 'Back to Home'; onPress (navigation.goBack()) was already unconditional in both branches — confirmed via HapticTouchable/TouchableOpacity prop trace, no disabled prop existed; commit b4a69d0"
---

## Problem

**BUG-10. ProfileScreen's back button claimed a block that didn't exist.**

Label read `hasName ? "Back to Home" : "Stay here until your name is saved"`,
but `onPress={() => navigation.goBack()}` was unconditional in both branches —
no `disabled` prop, confirmed by tracing `HapticTouchable` → `TouchableOpacity`
prop spreading. The button was always fully pressable; the label was lying
about it.

Surfaced by an `.impeccable` whole-app critique (same tool/gap as [[BUG-9]]).

## Verified/Fixed 2026-08-18

Two ways to resolve a label/behavior mismatch like this: change the copy to
match real behavior, or change the behavior to match the copy (actually gate
`goBack()` on `hasName`). Chose the copy fix — the separate banner at
`ProfileScreen.js:346-352` ("Set your name first so you can join games.")
already nudges without blocking, and there's no product reason found to
force a player to stay on Profile just because they haven't picked a name
yet. Back button now always reads "Back to Home"; `hasName` is still used for
the banner, no unused-variable cleanup needed.

Commit `b4a69d0`.

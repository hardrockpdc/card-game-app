---
id: CQ-9
type: quality
area: ui
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-17
evidence: "34 total screens today (was 35 as of 2026-08-15, now minus HostSetupScreen.js, deleted 2026-08-17); 23/34 use SafeAreaView, all correctly from react-native-safe-area-context, zero from the deprecated react-native package; KeyboardAvoidingView now in exactly 3 screens (JoinScreen, JoinOnlineScreen, WhoAmIGameScreen), all legitimately have TextInput -- the dead-weight HostSetupScreen.js instance is gone along with the file itself"
---

## Problem

**CQ-9 — SATISFIED (verified 2026-06-18).** All 18 screens already use
`SafeAreaView` from `react-native-safe-area-context` (zero use the wrong
`react-native` one). `KeyboardAvoidingView` is used only in the two text-input
screens (`JoinScreen`, `HostSetupScreen`), which is appropriate. Nothing to fix.

(Checklist-line summary — fuller v2 writeup deleted from the repo.)

## Verified 2026-08-15

**The core correctness claim still holds:** every screen that uses `SafeAreaView` sources
it correctly. 23 of today's 35 screens use `SafeAreaView`; a repo-wide grep for it being
imported from the deprecated plain `react-native` package returns zero hits, in `screens/`
or anywhere else. That part of CQ-9 is genuinely still true.

**But the "18 screens" / blanket-coverage framing is now false as literally written.** The
app has 35 screens today (roster growth: Who Am I?, Memory Match, `JoinOnlineScreen`, and
others added since 2026-06-18); only 23 of them (66%) use `SafeAreaView` at all. Whether
the other 12 (mostly variant/difficulty pickers, lobby screens, How-to-Play) actually need
it wasn't scoped by the original ticket and wasn't chased further here — flagged as
untested rather than assumed fine.

**The `KeyboardAvoidingView` claim is stale and partially inaccurate.** Originally "only
the two text-input screens (JoinScreen, HostSetupScreen)." Today it's 4 screens:
`JoinScreen`, `JoinOnlineScreen` (a new online-join screen not in the old roster, correctly
has real `TextInput`), `WhoAmIGameScreen` (correctly has real `TextInput`, 3 sites), and
`HostSetupScreen` — which has **zero `TextInput` anywhere** (confirmed by reading the full
159-line file: it only displays a read-only host name, an IP address card, and a "Go to
Lobby" button) yet still wraps its body in `KeyboardAvoidingView` at lines 88 and 99. This
means the original note's own cited example was arguably never actually a "text-input
screen," even back then. No functional bug — a keyboard that can never open never triggers
padding, so this is inert dead weight, not a runtime problem.

Marked `partial`: the correctness claim (import source) is genuinely still true, but the
coverage claim (which screens, how many) is stale enough that re-filing this as fully
`fixed`/`satisfied` without correction would itself become a new stale-doc problem.

## Fixed 2026-08-15

Removed both dead `KeyboardAvoidingView` wrappers in `screens/HostSetupScreen.js` (now
plain `View`); dropped the now-unused `KeyboardAvoidingView`/`Platform` imports. Zero
behavior change — the screen has no `TextInput`, so the keyboard could never open there.

While verifying importers before editing, found `HostSetupScreen.js` is not referenced
anywhere in the app (not in `App.js`'s navigation stack, not anywhere else) — the whole
159-line file is dead code, orphaned independent of this ticket. Not acted on here; flagged
for Pedro to decide whether to delete it or wire it back in.

## Deleted 2026-08-17

Pedro confirmed: delete it. `screens/HostSetupScreen.js` removed (re-confirmed still
unreferenced at deletion time — zero hits for `HostSetupScreen` anywhere in `App.js` or
any other file). The `KeyboardAvoidingView` coverage note above (4 screens, one of them
dead weight) now drops to 3 legitimate text-input screens (`JoinScreen`,
`JoinOnlineScreen`, `WhoAmIGameScreen`); the 35-screen count elsewhere in this file's
evidence is now 34.

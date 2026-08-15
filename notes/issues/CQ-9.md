---
id: CQ-9
type: quality
area: ui
status: partial
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "35 total screens today (was 18); 23/35 use SafeAreaView, all correctly from react-native-safe-area-context, zero from the deprecated react-native package; KeyboardAvoidingView now in 4 screens not 2 (JoinScreen, JoinOnlineScreen, WhoAmIGameScreen legitimately need it -- HostSetupScreen.js:88,99 wraps its body in it despite having zero TextInput anywhere, inert but stale)"
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

## Fix sketch

Documentation-accuracy fix, not a code fix: update the figures to 35 total screens, 23
use `SafeAreaView` (all correctly sourced), 4 use `KeyboardAvoidingView` (3 legitimately,
1 — `HostSetupScreen` — does not). Optional, low-priority code cleanup: remove the two
`KeyboardAvoidingView` wrappers in `screens/HostSetupScreen.js:88,99` since the screen has
no text input and the keyboard can never appear there — pure dead-weight removal, zero
behavior change.

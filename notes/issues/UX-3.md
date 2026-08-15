---
id: UX-3
type: ux
area: animation
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "App.js Stack.Navigator has zero freezeOnBlur/unmountOnBlur/detachInactiveScreens config anywhere (repo-wide grep, same finding as BUG-3); under React Navigation native-stack v7 default behavior, pushing HowToPlay on top of a game screen does not unmount it, so hasMountedRef (a useRef) never resets; static-code analysis only, not device-confirmed"
---

## Problem

## UX-3. Deal animation re-plays after closing How To Play (or any nav)

**Effort:** 15 minutes
**Risk if ignored:** Slightly weird visual — you close the tutorial overlay, and your cards re-animate in from above

### What's happening

When you navigate from a game screen to How To Play and back (or any other modal-style navigation), the game screen may unmount and re-mount depending on stack config. When it remounts, `hasMountedRef.current` resets to false, the 50ms timer runs again, and cards animate in.

### Why this matters

Subtle — but it makes the animation feel un-intentional. The cards weren't "just dealt," they were already there.

### The fix

Two approaches:

**A. Check the saved-state path** — when the screen mounts via a restore (loadGame returned data), set `hasMountedRef.current = true` synchronously before the first render. This way restored games never animate.

**B. Detach the screen from the stack** — set `freezeOnBlur` or `unmountOnBlur: false` on the navigation stack config for game screens, so they don't fully unmount when you navigate to HowToPlay or modal screens.

A is cleaner; B has broader implications (memory usage, etc.). Recommend A.

## Verified 2026-08-15

The in-game navigation path this bug describes is real and reachable today — all 7 game
screens (Blackjack, Last Card, Rummy, Poker, Solitaire, Conquián, Go Fish) expose a
"How to Play" item in their in-game menu (`components/GameMenu.js`, `type: "howto"`),
calling `navigation.navigate("HowToPlay", params)`. So the premise isn't moot for lack of
an entry point.

But the unmount/remount mechanism the bug depends on doesn't exist in this app's navigator.
`App.js` uses a single flat `createNativeStackNavigator()` with no `freezeOnBlur`,
`unmountOnBlur`, or `detachInactiveScreens` set anywhere (repo-wide grep, zero hits — same
finding already established for [[BUG-3]]). Under React Navigation native-stack v7's default
behavior, pushing `HowToPlay` on top of a game screen does not unmount what's underneath —
it stays mounted, just unfocused, so the stack can render it immediately on pop. Popping
`HowToPlay` (via the plain default header back button; the screen has no custom back
handling) doesn't remount the game screen either — same instance. Since `hasMountedRef` is
a `useRef`, its mount effect only fires on an actual mount, which never happens here. The
ref stays `true` the whole time; there is no second animation.

One thing worth flagging on its own: a `// UX-3:` comment already exists in
`ConquianGameScreen.js:529` and `RummyGameScreen.js:529` — but it addresses a *different*
scenario (fresh-app-launch resume, already covered separately in CLAUDE.md's "Standard
patterns" note on `hasMountedRef`), not this ticket's mid-game "navigate away and back"
case. Someone appears to have conflated the two — exactly the kind of mislabeled tracker
claim this restructure exists to catch.

This isn't a case of someone deliberately fixing the described failure mode — no code
changes the navigator config or adds an unmount-guard for this specific scenario. The app's
default navigation architecture simply never exhibited the behavior described, as opposed to
some other stack config the original report speculated about ("depending on stack config").
That makes it `moot` rather than `fixed`.

**Caveat:** this verdict is static-code analysis of React Navigation's documented native-stack
v7 behavior plus this app's own navigator config — not an on-device confirmation (no
emulator available in this environment). A 2-minute manual check would remove any doubt:
add a temporary log in a game screen's mount effect, play a game, tap How to Play from the
in-game menu, back out, confirm the log doesn't fire again and cards don't re-deal.

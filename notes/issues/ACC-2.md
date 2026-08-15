---
id: ACC-2
type: a11y
area: ui
status: partial
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "RummyGameScreen.js:250/238/542-546/1286-1287 and ConquianGameScreen.js:127/114/436-440/1888-1889 implement a real handReady state flag (fail-safe true, 1400ms guaranteed re-reveal, reduce-motion aware) per commit 80e2850 (2026-06-23); no TalkBack/VoiceOver device pass recorded anywhere since; PokerGameScreen.js:1178-1182 and GoFishGameScreen.js:598-603 have the identical staggered-deal pattern with zero equivalent gating, but were never claimed in scope by the original fix"
---

## Problem

## ACC-2. Deal animation may interfere with screen reader focus on rapidly-mounting cards

> **✅ RESOLVED 2026-06-23 (`80e2850`) — pending device test.** Implemented in
> `RummyGameScreen.js` + `ConquianGameScreen.js` with a `handReady` **state flag**
> (fail-safe default `true`; hidden only during the fresh deal; guaranteed 1400ms
> re-reveal timer). See the tracker entry above. The original "The fix" recipe
> below is **wrong** (it keys off `hasMountedRef`, a ref — no re-render — so the
> hand would never un-hide); kept only to show what NOT to do. Still needs a
> TalkBack/VoiceOver pass on a real device.

**Effort:** 15 minutes
**Risk if ignored:** Screen-reader users may have their focus jump around or get lost when cards animate in (especially Rummy's 10-card deal)

### What's happening

When Rummy's initial deal happens, all 10 cards mount at staggered times (0ms, 100ms, ... 900ms). Each card has an `accessibilityLabel` from ACC-2 (DEEP_REVIEW v2). VoiceOver / TalkBack might:
- Lose focus as cards appear
- Announce cards as they slide in, creating audio overlap
- Get stuck on a card that's in mid-animation

### Why this matters

For a sighted user the animation is nice. For a blind user, "Five of clubs. Three of diamonds. Jack of hearts. Eight of spades..." rapid-fire could be confusing.

### The fix

Add `accessibilityElementsHidden={!hasMountedRef.current}` to the hand container. This tells screen readers "ignore this region during the initial deal animation; reveal it once the animation completes." After the 50ms `hasMountedRef` timer fires, the region becomes accessible normally.

This is a minor tradeoff — screen reader users have a tiny delay before they can navigate the hand, but the hand is then stable and announceable in any order. Much better UX than a moving target.

## Verified 2026-08-15

**Code-level implementation is real and matches the resolution note exactly.** Both
`RummyGameScreen.js` and `ConquianGameScreen.js` declare `handReady` as
`useState(true)` (fail-safe default) — `RummyGameScreen.js:250`,
`ConquianGameScreen.js:127`. It's flipped `false` only inside the fresh-deal branch of
`initGame`/`init`, guarded by `!reduceMotionRef.current` (added in a later follow-up
commit, `e24df89`) — `RummyGameScreen.js:542-546`, `ConquianGameScreen.js:436-440`. A
`handReadyTimerRef` `setTimeout(..., 1400)` unconditionally flips it back to `true`,
cleared on unmount. The hand container applies both `accessibilityElementsHidden={!handReady}`
and `importantForAccessibility={handReady ? "auto" : "no-hide-descendants"}` —
`RummyGameScreen.js:1286-1287`, `ConquianGameScreen.js:1888-1889`. This is a genuine state
flag, not the broken `hasMountedRef`-ref recipe the original "The fix" section warned
against, and `git show 80e2850` confirms it landed in exactly this shape, touching only
these two files.

**The device-test gap is real and still open — kept this at `partial`, not `fixed`.**
`80e2850`'s own commit message says "Not device-verified (no TalkBack/VoiceOver available
in this environment)." Nothing in the two months since records an actual TalkBack pass —
the archive repeats "pending device test" in three separate places and nothing supersedes
it. This is treated differently than [[BUG-6]]'s similar field-verification gap: BUG-6 is
deterministic parsing logic fully covered by 10 passing unit tests, where a device pass was
a nice-to-have on top of code already provably correct. Here, the entire point of the fix
is real assistive-tech behavior — how `accessibilityElementsHidden`/`importantForAccessibility`
actually interacts with a real screen reader is exactly what unit tests can't validate. That
higher-stakes gap is why this stays `partial` rather than "fixed, gap noted."

**Scope gap, not a broken promise but worth tracking:** `PokerGameScreen.js:1178-1182`
(`dealDelay={index * 100}` on the initial 2-card deal) and `GoFishGameScreen.js:598-603`
(same pattern, up to 7 cards) both stagger-mount cards carrying `accessibilityLabel`
(`components/Card.js:161,251`) — the identical mechanism this bug worried about for Rummy —
with zero `handReady`-equivalent gating anywhere in either file. This isn't a failure of
this fix: the original bug text only ever named Rummy's 10-card deal, and the resolution
note is explicit it covers "Rummy + Conquián" only. But the general "staggered deal vs.
screen reader" concern is only partially addressed app-wide. LastCard and Solitaire don't
have the same shape of problem (LastCard deals one card at a time; Solitaire's deal
animation is a tableau layout, a different accessibility surface).

## Fix sketch

1. Get an actual TalkBack pass on a real Android device (this app is Android-only): confirm
   the hand region is genuinely silent during the ~1.25s deal on both Rummy and Conquián,
   and becomes navigable within the 1400ms window.
2. If scope should expand, apply the same `handReady`-style gating to
   `PokerGameScreen.js`'s hand row and `GoFishGameScreen.js`'s hand list — as a new,
   separately-scoped issue, not folded into this one's closure.

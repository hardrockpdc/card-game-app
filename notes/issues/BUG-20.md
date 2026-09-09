---
id: BUG-20
type: bug
area: ui
status: fixed
severity: low
opened: 2026-09-08
verified: 2026-09-08
evidence: "game/achievements.js:48 icon was U+1F5A7 THREE NETWORKED COMPUTERS, a text-presentation symbol with no emoji form in Noto Color Emoji. Rendered as a tofu box in the 'Achievements Unlocked!' dialog on emulator-5554 (Android 36) 2026-09-08, alongside 'Going Live' whose globe rendered fine. Scripted scan of all 15 achievement icons against the non-emoji ranges of Misc Symbols and Pictographs found this as the only affected one. Replaced with a house emoji"
---

## Problem

**BUG-20. The "Host with the Most" achievement icon rendered as a tofu box.**

The unlock dialog showed a blank replacement glyph where the icon should be:

```js
{ id: "host_most", ..., icon: "🖧", name: "Host with the Most", ... }
```

That character is **U+1F5A7 THREE NETWORKED COMPUTERS**. It sits in Miscellaneous Symbols
and Pictographs but is one of the block's text-presentation symbols — it has no emoji
form, so Android's Noto Color Emoji has no glyph for it and the system falls back to the
"tofu" box. Nothing is wrong with the surrounding code; the codepoint simply is not an
emoji.

Caught because the achievement fired during a device sweep, next to "Going Live" whose
globe rendered normally — the contrast is what made it obvious.

## Verified/Fixed 2026-09-08

Swapped for 🏠, which reads as "host" and is universally supported.

All fifteen achievement icons were then scanned programmatically against the
non-emoji-presentation ranges of that block. This was the only one affected — the other
fourteen are ordinary emoji and render correctly.

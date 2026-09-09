---
id: BUG-14
type: bug
area: ui
status: fixed
severity: medium
opened: 2026-09-08
verified: 2026-09-08
evidence: "PokerGameScreen.js:1074 rendered {variant || \"Texas Hold'em\"}, where `variant` is the config key from POKER_VARIANTS. Seen on emulator-5554 2026-09-08 as a header reading 'texasHoldem', and 'omaha'/'fiveCardDraw' on those variants. Now renders POKER_VARIANTS[variant]?.label; device-confirmed showing \"Texas Hold'em\""
---

## Problem

**BUG-14. The Poker header printed the raw variant key.**

```js
{variant || "Texas Hold'em"}
```

`variant` is the object key (`"texasHoldem"`, `"omaha"`, `"fiveCardDraw"`,
`"sevenCardStud"`), not display text, so the in-game header read **texasHoldem**.

Worth noting how this survived: the fallback string is a correctly formatted label, so
the line reads as though it produces one. Only the branch that never fires was right.
`POKER_VARIANTS` has carried a proper `label` for every variant the whole time.

## Verified/Fixed 2026-09-08

Now `POKER_VARIANTS[variant]?.label ?? "Texas Hold'em"`, with a comment at the call site
recording why the raw key must not go back. Device-verified: header reads "Texas Hold'em".

This also makes `PokerGameScreen` import from `game/poker.js` for the first time — see
[[BUG-11]], where the fact that it otherwise ignores that module entirely is the actual
problem.

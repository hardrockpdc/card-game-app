---
id: UX-2
type: ux
area: ui
status: fixed
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "screens/GameScreen.js:264 delayMs = dealerPlayed ? 2000 : freshDeal ? 2600 : 600, confirmed at all 4 call sites (315, 350, 407, 466); commit fd37a71 (original fix) plus two later refinements (4142a2d, 5c8c58f) that did not regress it"
---

## Problem

## UX-2. Result modal delay fires even when there's no dealer reveal to wait for

**Effort:** 10 minutes
**Risk if ignored:** Slight feels-laggy moment on hands that don't reveal the dealer (player bust before stand)

### What's happening

In `GameScreen.js` we added a 2000ms delay before showing the result modal so the dealer flip animation has time to play. That delay was perfect for the "you stand → dealer reveals" path.

But it ALSO fires for paths where there's no flip:
- Player busts on their hit → result is immediate, but modal still waits 2s
- Player gets natural blackjack → modal still waits 2s
- Adjust Bet returns to betting phase → already handled by the cancel

### Why this matters

A bust feels like the modal is slow. The animation reason isn't visible to the user — they just see a delay.

### The fix

Make the delay conditional. If `showFullDealerHand` is false at the moment of `resolveHandPayout` (meaning we're not going to do the dealer reveal — player bust, natural blackjack, etc.), use a shorter delay (~400ms) or no delay. Only delay 2s when we're showing the dealer reveal sequence.

Pseudocode:

```javascript
const needsFlipDelay = (
  result !== "blackjack" &&
  gameStatus === "finished" &&
  showFullDealerHand
);
const delayMs = needsFlipDelay ? 2000 : 400;

modalDelayTimerRef.current = setTimeout(() => {
  setScreenPhase("result");
}, delayMs);
```

The 400ms small delay still feels deliberate (not a "snap to modal") but doesn't drag.

## Verified 2026-08-15

The delay is no longer flat. Current logic, `screens/GameScreen.js:264`:

```js
const delayMs = dealerPlayed ? 2000 : freshDeal ? 2600 : 600;
```

Verified against every call site:
- **Bust mid-hand** (line 350) → `dealerPlayed=false, freshDeal=false` → **600ms**. This is
  the exact case the bug complained about ("modal still waits 2s") — now fast.
- **Natural blackjack on deal** (lines 315, 466) → `freshDeal=true` → **2600ms**. Longer
  than the original 2000ms, but deliberate: a later commit (`4142a2d`) found the modal was
  covering the cards before the player could read "Blackjack!", so this specific path's
  delay was intentionally lengthened past the flat value — a distinct, purpose-built number,
  not a leftover of the original bug.
- **Stand → dealer reveal** (line 407) → `dealerPlayed=true` → **2000ms**, correctly kept
  for the one path that actually needs to wait for the flip.

The implementation differs from the ticket's own pseudocode (explicit `dealerPlayed`/
`freshDeal` parameters instead of inferring from `showFullDealerHand`, and 600/2000/2600ms
rather than 400/2000ms) but the actual complaint — delay firing when there's nothing to wait
for — is resolved. Two commits landed after the original fix (`4142a2d`, `5c8c58f`), both
refining this same logic further without reverting the conditional behavior.

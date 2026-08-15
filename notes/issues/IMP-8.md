---
id: IMP-8
type: improvement
area: animation
status: partial
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "screens/SolitaireGameScreen.js:1034-1053 (flipMove/onCardTap) is a real measured FLIP fly animation for Solitaire's tap-to-move path, built 2026-07-05 (433e165, 4549516); components/useSolitaireDrag.js:214-219 and components/useConquianMeldDrag.js:184-203 both still snap instantly on a legal drop, only springing back on an invalid one -- deliberately not extended, per this ticket's own 'if players ask for it' guidance; Animations.md's recipe #3 mapping updated 2026-08-15 to reflect the tap-to-move/drag-and-drop split"
---

## Problem

## IMP-8. Card move animation (the spec's recipe #3)

**Effort:** 4-6 hours
**Was:** Deferred from animations session

### What's happening

The Animations.md spec has "recipe #3" — card move animation (drag from hand to table, fly from deck to slot, etc.). This is the genuinely hard one. We deliberately skipped it to keep momentum.

### When to tackle

After v1 ships and you have user feedback. If players ask for it, do it. If they don't notice, skip until you do another polish pass.

## Verified 2026-08-15

Note: per the restructure plan, IMP-8/IMP-9 are wishes, not defects — `type: improvement`,
verdict vocabulary here means "built / not built / partially built," not "open defect."

Partially built, and further along than the archive suggests. Solitaire's **tap-to-move**
interaction (Klondike/FreeCell/Spider) has a genuine fly/FLIP-style animation: `onCardTap`
(`screens/SolitaireGameScreen.js:1049`) routes through `flipMove()` (`:1036`), which
measures each moving card's old screen rect (`measureCardRects`, `:1014-1032`), applies
the move state-wise while hiding the real cards, and animates a ghost card sliding from
the old rect to the new one. Built 2026-07-05 — commits `433e165` ("animate normal card
moves (FLIP)") and `4549516` ("animate free-cell card moves in FreeCell (FLIP)") — well
after this ticket would have been filed as deferred.

**Not built:** Solitaire's **drag-and-drop** path — the more prominent interaction —
snaps instantly on a successful drop; `useSolitaireDrag.js:214-219` only calls
`dispatch(...)` + `clearDrag()` on a legal drop, no fly, and only springs the card back on
an *invalid* drop. Conquián's meld-drag (`useConquianMeldDrag.js:184-203`) has the same
shape — instant on success. Blackjack (hit/stand) and Rummy (deal-in only) remain fully
instant, matching what the doc already says for them. Conquián's meld auto-add specifically
had a fly animation at one point (`26bc828`) but it was deliberately replaced with an
in-place glow+pulse effect (`01ee2a5`, "replaces the fly") — a considered choice, not a gap.

**`Animations.md` itself is stale** — its "Repo mapping (current)" note for recipe #3
(lines 164-168) and its section preamble (line 106, "most recipes are implemented as
instantaneous state changes") still describe Solitaire moves as fully instant, with no
update reflecting the 2026-07-05 tap-move work. Exactly the kind of doc drift CLAUDE.md
§3.6 exists to prevent.

## Fixed 2026-08-15 (doc hygiene only)

`Animations.md`'s recipe #3 mapping now notes tap-to-move in Solitaire flies (cites
`flipMove` in `SolitaireGameScreen.js`), while drag-and-drop (`useSolitaireDrag.js`) and
Conquián meld-drag (`useConquianMeldDrag.js`) still snap instantly.

## Fix sketch (remaining, deliberately not done)

If full coverage is ever wanted: extend the same FLIP technique to the drag-and-drop
success path (`useSolitaireDrag.js`/`useConquianMeldDrag.js` — call the same
measure/ghost logic instead of dispatching immediately on a legal drop). This is a
4-6 hour feature build, not a bug — the original ticket's own guidance ("after v1 ships
and you have user feedback... if players ask for it, do it") still applies. Not attempted
here; no evidence anyone has asked for the drag-and-drop half specifically.

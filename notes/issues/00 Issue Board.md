---
verified: 2026-08-19
---

# Issue Board

Live views over every note in `notes/issues/`, built on **Bases** (Obsidian's core
plugin — no Dataview needed, confirmed enabled in this vault). If a view below doesn't
render, open `[[Issue Board.base]]` directly and check the Bases plugin is turned on
(Settings → Core plugins → Bases).

Every issue note's frontmatter (`status`, `severity`, `area`, `opened`, `verified`,
`evidence`) drives these views directly — nothing here is hand-maintained. Adding or
updating a note updates the board automatically.

## Needs attention

Everything currently `open` or `partial`. Sorted by `severity`, but note that's a plain
alphabetical sort (critical, high, low, medium) — not true priority order. With 10
rows here as of 2026-08-19 (4 `open` + 6 `partial`; CQ-3 and CQ-6 left this view on
2026-08-19) that's small enough to eyeball; click the `severity` column
header in Obsidian to re-sort, or scan for `critical`/`high` first.

![[Issue Board.base#Needs attention]]

## Unresolved questions

Everything marked `unclear` — not a known defect, a verification gap that couldn't be
settled by reading code alone (usually "needs a real device test").

![[Issue Board.base#Unresolved questions]]

## Verified longest ago

Everything **not** `fixed`/`moot`, oldest `verified` date first. This is the queue that
makes staleness visible — the whole point of the restructure. It's sorted rather than
hard-filtered at a fixed day threshold (the plan's original sketch used a 60-day cutoff
via Dataview's `dur()`; Bases' date-arithmetic syntax wasn't verifiable from outside
Obsidian while building this, so sorting was the safer choice over a filter that might
silently fail). If you want a hard 60-day cutoff, it's a one-line addition once you've
confirmed the right formula syntax in the Bases UI.

![[Issue Board.base#Verified longest ago]]

## Closed

Everything `fixed` or `moot`, most-recently-verified first.

![[Issue Board.base#Closed]]

## All issues

Full table, sorted by ID, no filter — the fallback view when the others don't answer
your question.

![[Issue Board.base#All issues]]

---

*Base file: [[Issue Board.base]]. Views are defined there; this note is just the
landing page + explanation, per the restructure plan's 1.4.*

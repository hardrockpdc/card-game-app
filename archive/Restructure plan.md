# Card Night — Docs Plan v2 (truth-first)

v1 assumed the docs were true and only badly organised. They are not. Pedro's
call: **verify everything against the code before writing it down.**

Order of work:
1. Verify the issue tracker (this is the priority)
2. Slim CLAUDE.md
3. Migrate the reference docs
4. Install the anti-staleness machinery

Phase 0 (container + vault wiring) is DONE. Obsidian is open on
`/workspace/card-game-app` and shares the mount with claude-code.

---

## Ground rules for the whole job

**R1. Evidence or it didn't happen.** Never mark an issue `fixed` without
citing `file:line` in today's code showing the problem is gone. A hunch, a
plausible-sounding memory, or "this was probably done in the audit" is not
evidence.

**R2. `unclear` is a respectable answer.** If you cannot determine the state in
a few minutes of looking, mark `status: unclear`, write what you checked and
what was ambiguous, and move on. A tracker with 6 honest `unclear`s is worth
more than one with 6 confident wrong answers. Do not guess to look decisive.

**R3. One subagent per issue.** Verification reads a lot of source. Dispatch a
subagent per issue so the main context holds verdicts, not file contents.
Otherwise you will run out of room around issue 8 and start skimming.

**R4. Never edit `archive/PROJECT_NOTES.md`.** It is the frozen original and
the only thing to diff against if a migration drops something.

**R5. Batch and commit.** One category per session. Commit after each. Do not
attempt all 30 issues in one run.

---

## Phase 1 — Verify the tracker  ← START HERE

### 1.0 Freeze the original

```bash
mkdir -p archive
git mv PROJECT_NOTES.md archive/PROJECT_NOTES.md
git commit -m "docs: freeze PROJECT_NOTES.md as archive before restructure"
```

### 1.1 The verification protocol

For each issue, working from its line range in `archive/PROJECT_NOTES.md`:

1. Read the original text in full. Do not summarise it yet.
2. Identify the concrete claim: which file, which behaviour.
3. Read that code as it exists **today**.
4. Check `git log -S'<distinctive string>' -- <path>` for a commit that
   addressed it.
5. Assign a verdict:

| status | means |
|---|---|
| `open` | reproduced in current code — cite file:line |
| `fixed` | the described problem is provably gone — cite file:line, and commit if found |
| `partial` | fixed in some call sites, not others — list which |
| `moot` | the code or feature no longer exists |
| `unclear` | could not determine — say what you checked |

`partial` matters here: BUG-4 already says "Conquián already fixed", so at
least one issue is known to be partial. Expect others.

6. Write `notes/issues/<ID>.md`:

```markdown
---
id: BUG-3
type: bug              # bug | perf | a11y | ux | quality | improvement | launch
area: multiplayer      # multiplayer | animation | theming | build | ui | data
status: open           # open | fixed | partial | moot | unclear
severity: high         # critical | high | medium | low
opened: 2026-06-04
verified: 2026-08-15   # date THIS verdict was checked against code
evidence: "screens/LobbyScreen.js:212 — broadcast interval still not cleared on blur"
---

## Problem
<original text from archive, verbatim — this is Pedro's diagnostic work, keep it>

## Verified 2026-08-15
<what you actually checked, what you found, what you could not determine>

## Fix sketch
<only if status is open or partial>
```

The `## Problem` section is copied verbatim. The `## Verified` section is new
and is where your judgement goes. Keeping them separate means a future
re-verification can rewrite the verdict without touching the original report.

### 1.2 Batches, in priority order

Run these as separate sessions, commit between each.

| Batch | Issues | Why this order |
|---|---|---|
| A | LAUNCH-1, LAUNCH-2 | release blockers; LAUNCH-1 is already marked resolved 2026-06-23 — confirm and close |
| B | BUG-1 … BUG-6 | correctness. **BUG-6 first** — silent TCP message loss causing multiplayer desync is the worst thing on the list |
| C | PERF-1, PERF-2, PERF-3 | startup cost; PERF-1 (7 themes × 53 images at launch) is measurable, so measure it |
| D | ACC-1, ACC-2 | accessibility; App Store review touches this |
| E | UX-1 … UX-4 | polish |
| F | CQ-1 … CQ-14 | **expect a high fixed/moot rate** — code-quality complaints age fastest, and there was an audit remediation pass on 2026-08-02/03 |
| G | IMP-8, IMP-9 | post-launch ideas; these are wishes, not defects — mark `type: improvement`, never `open` |

BUG-5 is struck through in the source (`~~WildRound has no save/resume~~ — N/A`)
— record it as `status: moot` rather than dropping it, so it stops resurfacing.

### 1.3 The 500-line graveyard

`archive/PROJECT_NOTES.md` lines 428–937, "Next Steps When We Resume", plus
lines 379–427, "Where We Are Right Now".

Do **not** migrate these. Treat them as a source of *candidate* issues:

1. Read through and extract anything phrased as an unfinished task.
2. Discard anything already covered by an existing BUG/PERF/UX/CQ item.
3. Verify each survivor with the same protocol as 1.1.
4. Anything that survives verification as still-open becomes a new note with a
   fresh ID (`BUG-7`, `CQ-15`, …).
5. Everything else stays in the archive and is not carried forward.

Report the counts to Pedro: how many candidates, how many survived. If it turns
out that 500 lines produced two real items, that is a useful thing to know
about how these notes were being kept.

### 1.4 The board

`notes/issues/00 Issue Board.md`. Use Obsidian **Bases** if available (core),
otherwise the **Dataview** plugin:

````markdown
## Needs attention

```dataview
TABLE severity, area, evidence
FROM "notes/issues"
WHERE status = "open" OR status = "partial"
SORT choice(severity="critical",0,choice(severity="high",1,choice(severity="medium",2,3))) ASC
```

## Unresolved questions

```dataview
TABLE opened, evidence
FROM "notes/issues"
WHERE status = "unclear"
```

## Going stale — verified over 60 days ago

```dataview
TABLE status, verified
FROM "notes/issues"
WHERE verified < date(today) - dur(60 days) AND status != "fixed"
SORT verified ASC
```

## Closed

```dataview
TABLE status, verified
FROM "notes/issues"
WHERE status = "fixed" OR status = "moot"
SORT verified DESC
```
````

That third query is the point of the whole exercise. Staleness becomes a
visible queue instead of a silent rot.

---

## Phase 2 — CLAUDE.md, 31 KB → ~8 KB

Keep lines 1–132 (sections 0–4): the working agreement, the hard technical
rules, the process discipline. That content is behavioural, not factual, so it
does not go stale the way status does. It is the best thing in the repo.

Move out:
- §5 Project facts → `notes/architecture/Project Facts.md`, referenced as
  `@notes/architecture/Project Facts.md`
- §6 Open strategic context → `notes/product/Open Questions.md`
- §7 Current status (lines 133–end, ~19 KB of "fixed 2026-08-03") → delete from
  CLAUDE.md. The genuine *decisions* inside it become
  `notes/decisions/*.md`: the Wild +4 restriction and the illegal-tap
  feedback removal are real design calls with reasoning worth keeping. The
  rest is changelog and belongs to git.

Append to CLAUDE.md:

```markdown
## Where things live
- All notes: @notes/00 Index.md
- Open issues: @notes/issues/00 Issue Board.md
- Recent work: newest file in @notes/sessions/

## Documentation rules
- Status lives in exactly two places: issue frontmatter, and notes/sessions/.
  Never in this file, never in an architecture note.
- Any note stating a fact about the code carries a `verified:` date.
- If you change code that a note describes, update the note in the same commit.
- Do not add a "current status" section to this file. That is what made the
  previous version 31 KB.
```

Also fix: §3 is numbered 3.1, 3.2, 3.3, 3.5, 3.4, 3.6.

---

## Phase 3 — Reference docs

Only after Phase 1 and 2 are committed.

Regenerate rather than migrate anything derivable from the repo:
- `## Current Project Structure` (archive lines 100–230, written in June) —
  regenerate from the actual tree. Do not copy.
- `## Dependencies` (231–275) — regenerate from `package.json`.

Migrate with a `verified:` date, after spot-checking each against code:

| archive lines | note |
|---|---|
| 87–99 | `notes/architecture/Tech Stack.md` |
| 318–368 | `notes/architecture/Security Model.md` |
| 369–378 | `notes/architecture/Layout Conventions.md` |
| 969–992 | `notes/architecture/GameNetwork.md` |
| 993–1020 | `notes/architecture/Multiplayer Screen Pattern.md` |
| 1021–1152 | `notes/architecture/Responsive Layout and Orientation.md` (demote its `##` subheads to `###`) |
| 938–968 | `notes/architecture/Important Reminders.md` |
| 276–292 | `notes/design/Visual Style.md` |
| 293–317 | `notes/design/Card Themes.md` |
| 16–21 | `notes/product/Vision.md` |
| 32–86 | `notes/product/Roadmap.md` (merge GAME_ROADMAP.md) |
| 22–31 | `notes/product/About Pedro.md` |
| 2209–2249 | `notes/ops/Build and Release.md` |
| 2250+ | leave in archive |

`git mv` the loose root files:

```
Animations.md → notes/design/Animations.md
COIN_ECONOMY.md → notes/product/Coin Economy.md
CONQUIAN_SPEC.md → notes/specs/Conquian.md
LASTCARD_SPEC.md → notes/specs/Last Card.md
WILDROUND_SPEC.md → notes/specs/Wild Round.md
WHOAMI_SPEC.md → notes/specs/Who Am I.md
DATABASE_RULES.md → notes/specs/Database Rules.md
IOS_SETUP.md → notes/ops/iOS Setup.md
APP_STORE_REVIEW_NOTES.md → notes/ops/App Store Review Notes.md
RECONNECT_PLAN.md → notes/ops/Reconnect Plan.md
POST_LAUNCH_CHECKLIST.md → notes/product/Post-Launch Checklist.md
PRODUCT.md → notes/product/Product.md
GAME_ROADMAP.md → merged, then removed
```

Root keeps only `README.md` and `CLAUDE.md`.

Then fix every reference:

```bash
grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive \
  -e 'CONQUIAN_SPEC' -e 'LASTCARD_SPEC' -e 'WILDROUND_SPEC' -e 'WHOAMI_SPEC' \
  -e 'PROJECT_NOTES' -e 'GAME_ROADMAP' -e 'COIN_ECONOMY' -e 'DATABASE_RULES' \
  -e 'POST_LAUNCH' -e 'IOS_SETUP' -e 'APP_STORE_REVIEW' -e 'RECONNECT_PLAN' .
```

---

## Phase 4 — Keep it from rotting again

`.claude/commands/log.md`:

```markdown
---
description: Append a session entry to the Obsidian vault
---
Append to `notes/sessions/$(date +%F).md`, creating it if missing:

- **Changed** — files touched and why, one line each
- **Issues** — every notes/issues/*.md whose status changed, with frontmatter
  updated and `verified:` set to today
- **Decisions** — anything chosen over an alternative and why; significant ones
  also get a note in notes/decisions/
- **Next** — the single most useful next action
- **Open questions** — anything needing Pedro

Terse. Use [[wikilinks]]. Never duplicate an issue note's content — link it.
```

`.claude/commands/verify.md`:

```markdown
---
description: Re-verify a note against current code
---
Given a note path in $ARGUMENTS, re-check every factual claim it makes against
today's code. Update its `verified:` date, its `status:` and `evidence:` if
they changed, and rewrite the `## Verified` section. Rules R1 and R2 from
RESTRUCTURE_PLAN.md apply: evidence or it didn't happen, and `unclear` is a
respectable answer.
```

Habit: `/log` at the end of every session. `/verify` on whatever the stale
queue surfaces.

---

## Verification before declaring done

1. `ls notes/issues/*.md | wc -l` — expect ~30 plus any from 1.3
2. No issue note has `status: fixed` without a populated `evidence:` field
3. `wc -c CLAUDE.md` — roughly 8000, not 31000
4. `git status` — moves show as renames, not delete+add
5. `grep -rn 'PROJECT_NOTES' --exclude-dir=node_modules --exclude-dir=.git .`
   — hits only in `archive/`
6. Obsidian graph view: no orphan notes, no broken links
7. Fresh `claude` session: "what are the open launch blockers?" should find
   LAUNCH-2 through the index without being handed the file
8. Fresh `claude` session: "what's the riskiest open bug?" should surface BUG-6
   if it verified as open

Keep `archive/` for at least one release cycle.
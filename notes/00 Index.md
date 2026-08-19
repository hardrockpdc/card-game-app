---
verified: 2026-08-18
---

# Notes index

The Card Night vault. Status lives in exactly two places: issue frontmatter and
`notes/sessions/` — never here, never in an architecture note (see `CLAUDE.md`'s
Documentation rules).

## Start here

- [[issues/00 Issue Board]] — every tracked issue, live views by status
- [[architecture/Project Facts]] — stack, key files, standing patterns
- [[product/Open Questions]] — durable product/strategy decisions
- [[architecture/Current Project Structure]] — file tree, regenerated from the repo
- [[architecture/Dependencies]] — full dependency list, regenerated from `package.json`

## Architecture

[[architecture/Tech Stack]] · [[architecture/Security Model]] ·
[[architecture/Layout Conventions]] · [[architecture/GameNetwork]] ·
[[architecture/Multiplayer Screen Pattern]] ·
[[architecture/Responsive Layout and Orientation]] ·
[[architecture/Important Reminders]]

## Design

[[design/Visual Style]] · [[design/Card Themes]] · [[design/Animations]]

## Product

[[product/Vision]] · [[product/About Pedro]] · [[product/Roadmap]] ·
[[product/Coin Economy]] · [[product/Post-Launch Checklist]] · [[product/Product]]

## Ops

[[ops/Build and Release]] · [[ops/iOS Setup]] · [[ops/App Store Review Notes]] ·
[[ops/Reconnect Plan]]

## Specs

[[specs/Conquian]] · [[specs/Last Card]] · [[specs/Who Am I]] ·
[[specs/Database Rules]]

Wild Round was removed from the app (see `product/Product.md`'s principles); its
old spec is frozen at `archive/Wild Round Spec.md`, not linked here since it no
longer describes shipped code.

## Decisions

- [[decisions/Wild +4 Restriction]]
- [[decisions/Illegal-Tap Feedback Removed]]

## Archive

`archive/PROJECT_NOTES.md` is the frozen original tracker — never edit it, it's the
diff baseline if a migration ever drops something. Also frozen there:
`archive/Restructure plan.md` (the completed migration plan itself),
`archive/Wild Round Spec.md` (spec for a removed game, kept for history), and
`archive/Design Critique 2026-08-03.md` (one-off "impeccable" tool report,
score 23/40 — its unaddressed findings aren't yet in `notes/issues/`, so treat
that score as pre-restructure and unverified against current code).

Phase 3 of the restructure (regenerating the structure/dependency sections,
migrating the rest with a `verified:` date, and moving every loose root doc into
`notes/`) is now actually complete as of 2026-08-16 — root keeps only
`README.md` and `CLAUDE.md`. (The 2026-08-15 claim of this was premature: three
untracked files — `Restructure plan.md`, `Untitled.canvas`, `Card Night/` — were
still sitting at root uncommitted.)

## Sessions

`notes/sessions/` holds one dated entry per working session, appended by `/log`. The
newest file there is the project's live "what just happened" record.

- [[sessions/2026-08-18]] — Firebase rules republish recorded; stale doc citations repaired

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

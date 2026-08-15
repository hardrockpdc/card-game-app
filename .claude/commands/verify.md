---
description: Re-verify a note against current code
---
Given a note path in $ARGUMENTS, re-check every factual claim it makes against
today's code. Update its `verified:` date, its `status:` and `evidence:` if
they changed, and rewrite the `## Verified` section. Rules R1 and R2 from
`Restructure plan.md` apply: evidence or it didn't happen, and `unclear` is a
respectable answer.

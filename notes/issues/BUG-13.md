---
id: BUG-13
type: bug
area: tooling
status: fixed
severity: high
opened: 2026-09-08
verified: 2026-09-08
evidence: "jest.config.js:22 testMatch was \"<rootDir>/__tests__/**/*.test.js\"; with the repo on \\10.0.0.1\Family correa\... Jest reported 'No tests found' and printed the interpolated pattern as 'Z:/10.0.0.1/Family correa/pedro/Projects/card-game-app/__tests__/**/*.test.js' — a malformed UNC/drive-letter hybrid matching 0 of 192 files. Reproduced from both Git Bash and PowerShell, so shell-independent. After switching to the relative pattern: 48 suites / 577 tests pass"
---

## Problem

**BUG-13. `npm test` silently found zero tests, so the project's own verification step was a no-op.**

`testMatch` used a `<rootDir>`-prefixed glob. When the project sits on a UNC path
or a mapped network drive, Jest interpolates `rootDir` into a malformed hybrid —
observed as `Z:/10.0.0.1/Family correa/...` for a repo whose real root is
`\10.0.0.1\Family correa\...` — and matches nothing:

```
No tests found, exiting with code 1
  192 files checked.
  testMatch: Z:/10.0.0.1/Family correa/.../__tests__/**/*.test.js - 0 matches
```

This is worse than an ordinary broken config. CLAUDE.md §3.2 and §3.5 both require
running `npm test` before pushing changes to tested game logic, so the guard those
rules depend on had been reporting nothing while appearing to be present. Any
regression in the 577 covered tests would have gone unnoticed.

Found during a full device-sweep session on 2026-09-08, as the first step of
running the suite.

## Verified/Fixed 2026-09-08

Switched to a rootDir-relative pattern:

```js
testMatch: ["**/__tests__/**/*.test.js"],
```

Jest resolves relative `testMatch` patterns against `rootDir` already, so this is
equivalent on a normal path and immune to the interpolation bug on a network one.
A comment at the call site records why the prefix must not come back.

Confirmed green afterwards: **48 suites, 577 tests passing**. Runtime also dropped
from 518s (network share) to 10.3s once the working copy moved to a local disk —
unrelated to this fix, but worth knowing the suite is cheap to run now.

Related: [[BUG-11]] is a direct consequence — Poker's variant logic is fully
covered by `__tests__/poker.variants.test.js` and passing, while the screen that
ships to users never calls it. Green tests were never going to catch that, but a
suite that runs at all is the precondition for noticing such gaps.

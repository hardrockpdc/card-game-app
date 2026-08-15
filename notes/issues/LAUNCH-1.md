---
id: LAUNCH-1
type: launch
area: build
status: fixed
severity: critical
opened: 2026-05-17
verified: 2026-08-15
evidence: "gh api repos/hardrockpdc/card-game-app/pages returns status: built, source main//docs, https_enforced true; live curl https://hardrockpdc.github.io/card-game-app/privacy.html returns 200 with content matching docs/privacy.html byte-for-byte; screens/AboutScreen.js:16 wires that exact URL"
---

## Problem

## LAUNCH-1. Privacy policy file ✅ RESOLVED (2026-06-23)

`docs/privacy.html` committed to main. **One manual step remaining:** Enable GitHub Pages in repo Settings → Pages → Source: main branch, /docs folder → Save. Once done, `https://hardrockpdc.github.io/card-game-app/privacy.html` will be live within ~1 minute.

**Effort:** 15 minutes
**Risk if ignored:** **App Store will reject the submission** — they tap the privacy policy URL and get a 404.

### What was happening

Back in DEEP_REVIEW v2 we set the URL `https://hardrockpdc.github.io/card-game-app/privacy.html` in `screens/AboutScreen.js` and `APP_STORE_REVIEW_NOTES.md`. The URL was wired in code, but the file didn't exist. Now resolved — see `docs/privacy.html`.

When the App Store reviewer taps "Privacy Policy" in your app, the browser opens that URL and gets a "Page Not Found." That's an automatic rejection.

### Why this is the highest-priority remaining item

Of everything in this doc, this is the only item that will definitely cause a rejection. Everything else is internal quality. Solve this before submitting.

### The fix (manual, outside Claude Code)

Enable GitHub Pages: Repo → Settings → Pages → Source: `main` branch, `/docs` folder → Save. Wait ~1 minute for Pages to deploy, then visit the URL to confirm it loads. (Full privacy-policy template omitted here — see `docs/privacy.html` for the live version.)

## Verified 2026-08-15

The manual step the ticket flagged as outstanding — enabling GitHub Pages — has actually
been done, confirmed against live external state rather than inferred from code:
`gh api repos/hardrockpdc/card-game-app/pages` returns `status: "built"`, source
`main`/`/docs`, HTTPS-enforced. A direct `curl` against the production URL returned `200`,
with body content matching `docs/privacy.html` exactly. `screens/AboutScreen.js:16` still
wires that exact URL via `Linking.openURL`. About as strong as evidence gets short of an
actual store submission.

The ticket's Apple/App-Store framing is stale — distribution is Android-only/Google Play
now (per `CLAUDE.md`) — but the underlying requirement (the wired URL must resolve, not
404) is what actually mattered, and it holds regardless of which store.

**Adjacent, genuinely separate gap found while checking `POST_LAUNCH_CHECKLIST.md`:** an
open item there (line 97) calls for adding a privacy-policy line covering crash data
leaving the device, required for the next Play submission now that Sentry is wired. This
arose after LAUNCH-1 was written and was never part of its scope — not folded into this
verdict, but worth its own tracker entry if not already covered elsewhere.

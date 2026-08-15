---
id: LAUNCH-3
type: launch
area: build
status: open
severity: high
opened: 2026-08-15
verified: 2026-08-15
evidence: "app.json:36 versionCode 9 / 1.1.0, staged 2026-07-22 but never built (notes/product/Post-Launch Checklist.md:3 shows only versionCode 8 was ever submitted, 2026-07-01); CLAUDE.md:312 states Firebase security rules changed 2026-08-02 and are NOT YET RE-DEPLOYED; notes/product/Post-Launch Checklist.md:80-101 lists 5 unchecked blocking items; app.json:57 expo.extra.sentryDsn is still null"
---

## Problem

Surfaced during verification of [[LAUNCH-2]] (2026-08-15), not present in the original
tracker under its own ID — filed fresh per the restructure plan's rule that a survivor
found during verification gets a new ID rather than being folded into the ticket that
surfaced it.

**Production build is stale relative to both the versioned config and the code — most
importantly, relative to a set of security fixes.** This is the Android-only,
current-day equivalent of what LAUNCH-2 originally worried about (a production build not
matching the app's actual current config/permissions/security posture), just with
security-exposure stakes instead of a permission-description crash.

Specifically:

- Only **versionCode 8** was ever actually submitted anywhere — Closed testing (Alpha),
  2026-07-01 (`notes/product/Post-Launch Checklist.md:3`).
- `app.json`'s `android.versionCode` was bumped to **9** (`version: "1.1.0"`) on
  2026-07-22, explicitly staged for "the next production build" — but this is a
  version-number change committed to source, not evidence a build was actually run. No
  commit or doc in the repo records an `eas build` having happened since.
- **49 commits landed on `main` after that version bump**, including two security fixes
  on 2026-08-02: moving private per-player hands out of a world-readable Firebase
  subtree (`ab6e47e`), and pinning `net/toHost/sender` to `auth.uid` to stop one player
  impersonating another (`9c1c09b`).
- `CLAUDE.md:312` states directly: **"Firebase security rules — CHANGED 2026-08-02, NOT
  YET RE-DEPLOYED."** The client-side code for both fixes is inert until
  `database.rules.json` is republished in the Firebase console — a manual step,
  currently unchecked.
- `notes/product/Post-Launch Checklist.md`'s "Security audit remediation — BLOCKING" section lists 5
  unchecked items, starting with that rules republish.
- `expo.extra.sentryDsn` is still `null` in `app.json:57`, so crash reporting remains a
  deliberate no-op even though Sentry is wired into the code.

**Net effect as of 2026-08-15:** no production build reflects either the current
`app.json` version or the post-2026-08-02 security-fix code, and the server-side rules
those fixes depend on aren't live yet either. Anyone playing online multiplayer today is
running against the pre-fix rules, which is the actual live exposure — not a hypothetical.

## Fix sketch

1. Re-publish `database.rules.json` in the Firebase console (Realtime Database → Rules →
   Publish) — blocking, per `notes/product/Post-Launch Checklist.md:86-90`.
2. Re-test online multiplayer end-to-end on 2 devices against the new rules
   (`notes/product/Post-Launch Checklist.md:91-94`).
3. Set `expo.extra.sentryDsn` in `app.json` so crash reporting isn't a no-op, and add the
   privacy-policy line covering crash data leaving the device (see [[LAUNCH-1]]'s
   adjacent-gap note; `notes/product/Post-Launch Checklist.md:95-99`).
4. Run `eas build --profile production --platform android` for versionCode 9 / 1.1.0
   (recipe at `notes/product/Post-Launch Checklist.md:70-78`), then submit to Play Console.

---
id: LAUNCH-3
type: launch
area: build
status: open
severity: high
opened: 2026-08-15
verified: 2026-09-10
evidence: "app.json:37 versionCode 9 / 1.1.0 (app.json:5), CORRECTED 2026-09-10 — versionCode 9 WAS built and released to the closed track on 2026-07-26, per the Play Console itself; the repo never recorded it and this ticket wrongly said "never built" until now. v8 (1.0.0) sits on the Internal testing track, not Closed; the 2026-08-02 rules fixes were reported republished in the Firebase console by Pedro on 2026-08-18 -- unconfirmable from the repo, and the committed database.rules.json was checked the same day as paste-clean (single top-level rules key, no comment keys); as of 2026-09-09 the checklist's BLOCKING section has 2 unchecked items (sentryDsn, Solitaire memoization device-check) — the 2-device retest passed 2026-09-09; app.json:59 expo.extra.sentryDsn is still null"
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
- The client-side code for both fixes was inert until `database.rules.json` was
  republished in the Firebase console — a manual step outside the repo. **Pedro reports
  doing that publish on 2026-08-18** (see the 2026-08-18 update below).
- `notes/product/Post-Launch Checklist.md`'s "Security audit remediation — BLOCKING" section now
  has 3 unchecked items: the 2-device retest, `sentryDsn`, and the Solitaire
  memoization device-check.
- `expo.extra.sentryDsn` is still `null` in `app.json:59`, so crash reporting remains a
  deliberate no-op even though Sentry is wired into the code.

**Net effect as of 2026-08-15 (superseded in part — see the 2026-08-18 update):** no production build reflects either the current
`app.json` version or the post-2026-08-02 security-fix code, and the server-side rules
those fixes depend on aren't live yet either. Anyone playing online multiplayer today is
running against the pre-fix rules, which is the actual live exposure — not a hypothetical.

## Fix sketch

1. ~~Re-publish `database.rules.json` in the Firebase console~~ — reported done
   2026-08-18, unconfirmed until step 2 passes.
2. Re-test online multiplayer end-to-end on 2 devices against the new rules
   (`notes/product/Post-Launch Checklist.md:91-94`).
3. Set `expo.extra.sentryDsn` in `app.json` so crash reporting isn't a no-op, and add the
   privacy-policy line covering crash data leaving the device (see [[LAUNCH-1]]'s
   adjacent-gap note; `notes/product/Post-Launch Checklist.md:95-99`).
4. Run `eas build --profile production --platform android` for versionCode 9 / 1.1.0
   (recipe at `notes/product/Post-Launch Checklist.md:70-78`), then submit to Play Console.

## Update 2026-08-18 — rules republished (reported), still open

Pedro republished `database.rules.json` in the Firebase console on 2026-08-18. That
closes the first and highest-stakes blocker in the fix sketch, but **this ticket stays
`open`**, for two reasons.

**The publish is reported, not verified.** The Firebase console is the only witness to
what the live rules actually say; nothing in this repo can read them back. What was
checked locally on 2026-08-18 is the thing most likely to have made the paste fail: the
committed `database.rules.json` parses as JSON with exactly one top-level key (`rules`)
and contains no `//` comment keys, which is the shape the console accepts. So there is no
known reason the publish would have been rejected — but "no known reason to fail" is not
confirmation. Per the checklist's own pairing, the **2-device end-to-end retest** is what
confirms it, and that is still outstanding: deal a poker hand and check it reaches the
right player and nobody else's is visible, since the fix moved private hands to
`privateNet/*` and a bad deploy breaks hands specifically.

**The production build is still stale.** The original complaint had two halves and only
one moved. `app.json:37` is still versionCode 9 / `1.1.0` (`app.json:5`), still never
built — only versionCode 8 was ever submitted (2026-07-01). Every player on the store
build is still running pre-fix client code regardless of what the server rules now say.
`expo.extra.sentryDsn` is still `null` (`app.json:59`).

Remaining, in order: 2-device retest → set `sentryDsn` (native module, needs a dev-client
rebuild) → `eas build` versionCode 9 → submit.


## Update 2026-09-09 — 2-device retest passed; the build gap has widened

**The retest is done and it passed.** An online poker room hosted on one client and
joined from a second, played to showdown: host held A♣ J♠, client held 5♠ 6♦, and each
client saw **only its own hole cards** — the opponent's seat rendered no cards at all
until showdown, while every shared value (pot, stacks, board, turn order) matched on both
devices. At showdown both hands revealed and scored correctly against a board of
7♦ Q♥ 6♣ 4♦ Q♥: client Two Pair (queens and sixes) over host One Pair, 40 pot paid to the
right player.

That closes the item this ticket has been waiting on since 2026-07-04. It confirms the
2026-08-18 rules republish actually took, and that private hands under `privateNet/*` are
scoped to their owner — a bad rules deploy would have broken hands specifically, and did
not.

Two honest limits on that evidence:

- The clients were **Android emulators on one machine**, not two physical handsets. The
  property that matters for a rules check is that they are separate installs with
  separate app data authenticating independently, which they are. It is not a substitute
  for a physical-device pass if one is wanted before shipping.
- It confirms the rules **as published today**. Nothing in the repo can read the console
  back, so this is evidence of correct behaviour, not a transcript of the rules text.

**The build half has moved backwards.** When this ticket was written, 49 commits had
landed since the version bump. As of 2026-09-09 it is **136**, and `app.json` is still
versionCode 9 / 1.1.0 — the staged number never moved because no build was ever run. The
2026-09-08 session alone added 13 commits, several of them behavioural rather than
cosmetic: three of four Poker variants went from non-functional to actually dealing and
scoring by their own rules ([[BUG-11]]), the hardware Back button stopped being captured
after leaving any game ([[BUG-21]]), Blackjack gained Double Down ([[BUG-22]]), and the
test suite went from silently running zero tests to 595 passing ([[BUG-13]]).

So the store build is now further from the code than when this was filed, and the gap is
no longer only a security one — a player on versionCode 8 is playing materially different
games.

`expo.extra.sentryDsn` is still `null` (`app.json:59`).

Remaining, in order: set `sentryDsn` (native module, needs a dev-client rebuild) →
`eas build` versionCode 9 → submit.


## Correction 2026-09-10 — versionCode 9 was built; this ticket said otherwise

A Play Console review on 2026-09-10 contradicts the central factual claim of this
ticket. **versionCode 9 (1.1.0) was built and released to the closed track on
2026-07-26.** The repo has no record of it, which is why every version of this note
said it was staged but never built — and why the 2026-09-09 update made that claim
more emphatic rather than checking it.

What the console actually shows:

- Closed track ("first initial release"): **versionCode 9 (1.1.0), released 2026-07-26**,
  active, live in 2 countries.
- Internal testing track: v8 (1.0.0). So "only versionCode 8 was ever submitted" was
  wrong on both counts — 9 shipped, and 8 was internal rather than closed.

**The conclusion survives; the reasoning was wrong.** The build date is 2026-07-26 and
the two security fixes landed 2026-08-02 (`ab6e47e`, `9c1c09b`), so the build on the
closed track still **predates them**. Testers on that build are running pre-fix client
code, exactly as this ticket has always argued — just because the build is a week too
early, not because it never happened.

The correct staleness figure is **commits since the build, not since the version bump**:
**140 commits** as of 2026-09-10. The "136 since the bump" line above measured the wrong
thing.

Also worth recording: `app.json` is still on versionCode 9, which is now **already used**
on the closed track. Any further Android upload must bump it — the console rejects a
repeat.

## Lesson for this ticket's evidence

Every version of this note reasoned about the store from repo contents alone, and the
repo cannot see the Play Console. The staleness argument was sound; the build history was
invented from the absence of a commit saying otherwise. Console state needs to be read,
not inferred — the same rule this ticket already applies to the Firebase rules.

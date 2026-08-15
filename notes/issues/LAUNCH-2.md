---
id: LAUNCH-2
type: launch
area: build
status: moot
severity: low
opened: 2026-05-17
verified: 2026-08-15
evidence: "no ios/ native folder or GoogleService-Info.plist anywhere in the repo; notes/ops/iOS Setup.md Phase 0 (Apple Developer enrollment) never checked off; CLAUDE.md:47/100 confirms Android-only distribution, decided 2026-06-01 (31328e9), about 2 weeks after this ticket was filed -- no iOS binary, dev or production, has ever existed for this app"
---

## Problem

## LAUNCH-2. EAS production build pending

**Effort:** 30-90 minutes (depending on whether you've used EAS before)
**Risk if ignored:** The iOS permission descriptions from v2 (NSCameraUsageDescription, NSPhotoLibraryUsageDescription) live in `app.json`, but they don't take effect on real devices until you produce a fresh native build. Without a new build, an iOS user who tries to take a profile photo will hit the **old** binary without the description and crash.

### What's happening

`app.json` config changes (especially `infoPlist` keys) get compiled into the iOS binary at build time. Your current TestFlight / development build was made before we added the camera permission descriptions, so it's missing them in its `Info.plist`.

Per PROJECT_NOTES.md, this is already on your "Still to do before EAS production build" list. It's the actual final step before submission.

### Why this matters

- iOS will crash hard on any code path that triggers `NSCameraUsage` without a description
- The build is what gets submitted to the App Store, not the JavaScript bundle alone
- Until you re-build, the JS changes since the last build are running on an older native layer

### The fix (separate workflow)

1. Install EAS CLI if you haven't: `npm install -g eas-cli`
2. `eas login` (with your Expo account)
3. `eas build:configure` (first time only — creates `eas.json`)
4. `eas build --profile production --platform all`
5. Wait 10-20 min for the cloud build
6. Download the resulting .ipa (iOS) and .aab (Android) files
7. Upload to App Store Connect / Google Play Console

## Verified 2026-08-15

**The literal ticket is moot, and went moot almost immediately.** LAUNCH-2 was written
2026-05-17. The Android-only distribution decision first appears in `CLAUDE.md` on
2026-06-01 (`31328e9`) — about two weeks later. `notes/ops/iOS Setup.md` shows Phase 0 ("Enroll in
Apple Developer Program") was never checked off, and there is no `ios/` native folder or
`GoogleService-Info.plist` anywhere in the repo — no iOS build, dev or production, has
ever been produced for this app. The ticket's entire premise (an iOS user hitting a stale
binary without the camera permission description) required a distributed iOS binary that
never existed. Not fixed — overtaken by a distribution-scope decision before it could
matter. The `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription` strings remain
correctly present in `app.json`, kept per the cross-platform-code rule, so nothing needs
fixing there either if iOS shipping ever resumes.

**But the underlying category of problem is very much alive, in Android form — tracked
separately as [[LAUNCH-3]] rather than folded into this closed ticket.** Only versionCode
8 was ever actually submitted anywhere (Closed testing, 2026-07-01). versionCode was
bumped to 9 / version 1.1.0 on 2026-07-22, explicitly staged for the next production
build — but that's a version-number bump in source, not a build event, and nothing in the
repo shows `eas build` was ever actually run for it. 49 more commits have landed since,
including the 2026-08-02 security fixes, and `CLAUDE.md:312` states outright that the
Firebase security rules those fixes depend on were "CHANGED 2026-08-02, NOT YET
RE-DEPLOYED." See [[LAUNCH-3]] for the live risk this represents.

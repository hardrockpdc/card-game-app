---
verified: 2026-08-18
---

# iOS / App Store Setup Checklist

Card Night is React Native and has been kept cross-platform, so shipping iOS is
**setup + distribution work, not a rewrite.** Online multiplayer (Firebase) and
local WiFi multiplayer both already work cross-platform — an Android host and an
iPhone client can play in the same room once both have the app.

Do these in order. Phases marked **(Pedro)** are account/console steps you do;
**(Claude)** are repo changes to make when you're ready to start.

---

## Phase 0 — Apple Developer account (Pedro)
- [ ] Enroll in the **Apple Developer Program** — https://developer.apple.com — **$99/year**
      (Google was a one-time $25; Apple is annual). Approval can take a day or two.

## Phase 1 — iOS Firebase config (Pedro)
- [ ] Firebase Console → **Project Settings → Add app → iOS**
- [ ] iOS bundle ID: **`com.pedro.cardgameapp`** (must match `app.json`)
- [ ] Download **`GoogleService-Info.plist`**
- [ ] Put it in the **project root** (next to `google-services.json`), commit + push
      (this file is not secret — same as the Android one)

## Phase 2 — Repo changes (Claude, when the plist is in)

Audited against `app.json` and `eas.json` on 2026-08-18. Every box below is
currently unchecked in the repo — none of this config exists yet.

- [ ] `app.json` → add `ios.googleServicesFile: "./GoogleService-Info.plist"`
      (absent today; only `android.googleServicesFile` is set).
- [ ] Install `expo-build-properties` and add the plugin with
      `ios.useFrameworks: "static"` — **required** by `@react-native-firebase`
      on iOS. Without it the iOS build fails to compile Firebase pods.
      Not currently a dependency.
- [ ] Confirm iOS deployment target is high enough for Firebase (bump if needed).
- [ ] `app.json` → add **`ios.buildNumber`**. Absent today. Android has
      `versionCode: 9`; iOS has no equivalent, and App Store Connect rejects a
      second upload that does not increment it. Same discipline as versionCode:
      bump before every build.
- [ ] `eas.json` → add an **iOS build profile**. Today `build.production` is
      `{}` and only the `development`/`preview` profiles have any platform
      config, all of it Android (`buildType: apk`).
- [ ] `eas.json` → add **`submit.production.ios`** with `appleId`,
      `ascAppId`, and `appleTeamId`. Today `submit.production` is `{}`, so
      `eas submit` has nothing to work with.
- [ ] **Decide on `ios.supportsTablet`.** It is `true` today. That commits you
      to iPad review *and* a separate set of required iPad screenshots in App
      Store Connect. If the layouts were only ever exercised on Android phones,
      set it to `false` for v1 — it removes an asset requirement and a whole
      review surface, and can be turned back on later. Cheapest de-risking
      lever on this list.
- [ ] **Resolve the orientation conflict.** `app.json` sets a top-level
      `orientation: "portrait"`, which Expo maps to
      `UISupportedInterfaceOrientations`. On iOS, `expo-screen-orientation`
      **cannot** rotate to an orientation that is absent from the plist — an OS
      constraint, not a library limitation. Android is per-activity and ignores
      this, which is exactly why Solitaire's landscape lock has never been a
      problem. Expect Solitaire landscape to be broken on iOS until
      `ios.infoPlist.UISupportedInterfaceOrientations` includes the landscape
      values. Verify on a real device before assuming either outcome.
- [ ] Sanity-check native deps on an actual iOS build. The dep list is
      *plausibly* iOS-capable (tcp-socket, udp, gesture-handler, haptics,
      screen-orientation, image-picker, clipboard, network, audio, blur,
      linear-gradient, svg) — but this has never been verified by a build, so
      treat it as an assumption, not a fact. `react-native-tcp-socket` and
      `react-native-udp` deserve the most suspicion: they are the two packages
      `package.json` excludes from the Expo Doctor RN Directory check, and they
      are the only ones doing raw socket work.

> **Set expectations for Phase 3:** this app has never been compiled for iOS.
> Not once — there is no `ios/` directory and no build on record. The missing
> plist and `useFrameworks: "static"` are the two *known* failures; a first
> iOS build routinely surfaces unknown ones too. Budget for a debugging session,
> not a single green build.

## Phase 3 — Build & test (Pedro, with Claude on any errors)
- [ ] `eas build --profile production --platform ios`
      (EAS can create the App ID + provisioning with your Apple login — no Mac needed)
- [ ] Create the app in **App Store Connect** (name "Card Night", bundle id)
- [ ] Distribute via **TestFlight** to your iPhone friends
- [ ] iOS test pass — verify on a real iPhone:
  - [ ] Profile photo picker (system PHPicker, no permission prompt)
  - [ ] Take Photo (camera permission prompt appears)
  - [ ] Haptics
  - [ ] Portrait lock everywhere except Solitaire (landscape)
  - [ ] **Local WiFi multiplayer** — iOS shows a one-time Local Network permission
        prompt the first time (that's the `NSLocalNetworkUsageDescription`)
  - [ ] **Online multiplayer** — host on one platform, join on the other
  - [ ] Sounds

## Phase 4 — App Store submission (Pedro)
- [ ] iPhone **screenshots** (App Store requires specific sizes — currently 6.7")
- [ ] **Privacy policy URL** (same one used for Google Play)
- [ ] **Age rating** questionnaire. Blackjack and Poker use simulated wagering
      with virtual chips, so the "simulated gambling" question applies and will
      likely push the rating above the lowest tier — a tension with the
      family-friendly positioning in `CLAUDE.md` §4. Decide how to handle that
      before filling in the form. Understating it to protect a 4+ rating is not
      an option.
- [ ] **App Privacy "nutrition labels"** — do **not** answer "Data Not
      Collected"; it is not accurate for this app. The exact per-field answers
      are in `notes/ops/App Store Review Notes.md`, verified against the code:
      Identifiers → User ID (Firebase anonymous auth UID), User Content →
      Photos (the profile picture, which **is transmitted** — custom photos are
      downscaled and base64-encoded by `game/avatarTransmit.js`, not kept on
      device as an earlier version of this note claimed), User Content → Other
      (display name + game state). Diagnostics → Crash Data only if
      `expo.extra.sentryDsn` is set in the submitted build. Nothing is used for
      tracking, so no ATT prompt and no `NSUserTrackingUsageDescription`.
- [ ] Submit for review (stricter/slower than Google, but a family card game is low-risk)

---

## Gotchas / notes
- **`useFrameworks: static`** (Firebase) can make iOS builds slower and
  occasionally conflicts with other pods — this is the most common iOS+Firebase
  Expo build failure. If a build breaks, this is the first place to look.
- **Firebase security rules: the file is hardened, the live console copy is not
  confirmed.** `database.rules.json` is no longer test-mode — it is auth-gated,
  pins room writes to the host, pins `net/toHost/sender` to `auth.uid`, and
  keeps private hands under `privateNet/*`. But the repo file is not what
  Firebase enforces; the console copy is, and it has not been republished since
  the 2026-08-02 security fixes (`ab6e47e`, `9c1c09b`). Until someone publishes
  it, those two fixes are inert and private hands remain readable by everyone in
  the room. Tracked as [[LAUNCH-3]] — blocking for a public launch on **either**
  platform, not an iOS-specific item.
- Distribution is expanding from Android-only to **Android + iOS**; keep the
  cross-platform code intact (already a project rule).

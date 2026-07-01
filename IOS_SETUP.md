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
- [ ] `app.json` → add `ios.googleServicesFile: "./GoogleService-Info.plist"`
- [ ] Install `expo-build-properties` and add the plugin with
      `ios.useFrameworks: "static"` — **required** by `@react-native-firebase`
      on iOS. Without it the iOS build fails to compile Firebase pods.
- [ ] Confirm iOS deployment target is high enough for Firebase (bump if needed).
- [ ] Sanity-check native deps are all iOS-capable (they are: tcp-socket, udp,
      gesture-handler, reanimated/worklets, haptics, screen-orientation,
      image-picker, clipboard, network, audio).

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
- [ ] **Age rating** questionnaire
- [ ] **App Privacy "nutrition labels"** — declare what's collected:
      profile name + optional photo (stored on device, sent to other players in a
      game), anonymous Firebase auth id. No third-party ad tracking.
- [ ] Submit for review (stricter/slower than Google, but a family card game is low-risk)

---

## Gotchas / notes
- **`useFrameworks: static`** (Firebase) can make iOS builds slower and
  occasionally conflicts with other pods — this is the most common iOS+Firebase
  Expo build failure. If a build breaks, this is the first place to look.
- The **Firebase security rules are still wide-open (test mode)** — lock them
  down before any public launch on either platform. (Tracked separately.)
- Distribution is expanding from Android-only to **Android + iOS**; keep the
  cross-platform code intact (already a project rule).

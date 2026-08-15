---
verified: 2026-08-15
---

# Build & release status

### Current state (2026-08-15)

Only **versionCode 8** has ever actually been submitted anywhere (Closed testing/
Alpha, 2026-07-01). `app.json`'s `android.versionCode` was bumped to **9** (version
`1.1.0`) on 2026-07-22, staged for the next production build — but no production build
has actually been run since. See [[LAUNCH-3]] for the full picture, including why this
now matters more than a routine version bump: the 2026-08-02 Firebase security fixes
and the Sentry crash-reporting wiring are both sitting in code, unreflected in any
shipped build, and the Firebase rules those fixes depend on aren't even republished in
the console yet.

Blocking items before the next production build, per `POST_LAUNCH_CHECKLIST.md`:
1. Re-publish `database.rules.json` in the Firebase console.
2. Re-test online multiplayer end-to-end on 2 devices against the new rules.
3. Set `expo.extra.sentryDsn` in `app.json` (currently `null` — crash reporting is a
   deliberate no-op until this is set).
4. Add a privacy-policy line covering crash data leaving the device now that Sentry is
   wired (see [[LAUNCH-1]] for the existing, live privacy policy this would extend).
5. Run `eas build --profile production --platform android` for versionCode 9 / 1.1.0,
   then submit to Play Console.

### Build workflow (for native deps/config changes)

```
eas build --profile development --platform android
```

...then install the new APK and `npx expo start --dev-client`. Native changes (new
modules, `app.json` manifest/config) only take effect after a build — EAS is the only
path (local `expo run:android` doesn't work on this machine). Pure-JS changes hot-reload
over Metro with no rebuild.

### What shipped in the 2026-06-04 development build (historical)

All confirmed live on device at the time:
- **Immersive bars** — `react-native-edge-to-edge` + `<SystemBars hidden>` in `App.js`.
- **`expo-screen-orientation`** native module — drives the runtime orientation lock.
- **`react-native-gesture-handler`** — powers Solitaire drag-and-drop.
- **Smaller APK** — dead JEWEL theme + unused source icon removed.
- **Local-network permissions** confirmed present for multiplayer.

`app.json` remains `"orientation": "default"`; the runtime lock decides.

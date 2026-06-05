# Pending — needs an EAS dev build

> ✅ **Built & verified 2026-06-04.** A development build was made and installed;
> immersive bars, free rotation, the Solitaire landscape locks, and the smaller
> APK are all live and confirmed working on device. The items below are now
> **done** — this file is kept as a record and a template for the *next* time
> native changes accumulate. (Dependency tree was also cleaned pre-build:
> removed dead `react-native-draggable-flatlist`; pinned/deduped
> `expo-asset`/`expo-constants` to SDK 54.)

These changes are **native** (new modules or `app.json` manifest/config), so they
are NOT live in the currently-installed dev client. They only take effect after:

```
eas build --profile development --platform android
```

…then install the new APK and `npx expo start --dev-client`.
(Local `expo run:android` does not work on this machine — EAS is the only path.)

Everything else done recently (Solitaire landscape layouts, card sizing, quit
button, stats/header merge, etc.) is **pure JS and already live** via Metro.

---

## What's waiting on the rebuild

1. **Immersive bars** — `react-native-edge-to-edge` + `<SystemBars hidden>` in
   `App.js`. Hides the top status bar (time/battery/signal) and bottom nav bar.
   - dependency `react-native-edge-to-edge` + plugin in `app.json`.
   - Currently guarded so the old binary doesn't crash; bars still show until built.

2. **Free rotation** — `app.json` `"orientation": "default"` (was `portrait`).
   Lets the app rotate at all. Without this, nothing rotates on device.
   > ⚠️ **Superseded at runtime (2026-06-04):** `app.json` is still `"default"`,
   > but the app now locks orientation at runtime via `expo-screen-orientation` —
   > **portrait-locked app-wide, Solitaire landscape-locked**. So the app does
   > NOT rotate freely anymore; "default" just lets the runtime lock decide.

3. **Solitaire landscape lock** — `expo-screen-orientation` (`~9.0.9`).
   Locks all five variants (Klondike / FreeCell / Spider / Pyramid / TriPeaks)
   to landscape on focus, releases on leave.
   - Guarded require, so it's a no-op (no lock, no crash) until built.

4. **(verify) Local-network permissions** — Android `NEARBY_WIFI_DEVICES`,
   `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `INTERNET` were added earlier for
   multiplayer. Confirm the installed binary already has them; if not, this build
   covers them too.

---

## Verify after the build

- Both system bars hidden (top + bottom); swipe from an edge reveals briefly.
- The app is **portrait-locked everywhere except Solitaire** (updated 2026-06-04;
  was "rotates freely"). Menus/portrait screens stay portrait even if rotated.
- **All five Solitaire variants force landscape**; leaving Solitaire restores
  portrait (not free rotation). Drag-and-drop works in Klondike/FreeCell/Spider.
- (If #4 applied) multiplayer host/join still works.

## Status

- All five Solitaire variants now have landscape layouts (pure JS, live on the
  current binary — test by rotating). The landscape *lock* for them is item #3
  above and needs the build.

# Pending — needs an EAS dev build

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

3. **Solitaire landscape lock** — `expo-screen-orientation` (`~9.0.9`).
   Locks Klondike / FreeCell / Spider to landscape on focus, releases on leave.
   - Guarded require, so it's a no-op (no lock, no crash) until built.

4. **(verify) Local-network permissions** — Android `NEARBY_WIFI_DEVICES`,
   `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `INTERNET` were added earlier for
   multiplayer. Confirm the installed binary already has them; if not, this build
   covers them too.

---

## Verify after the build

- Both system bars hidden (top + bottom); swipe from an edge reveals briefly.
- App rotates; menus/portrait screens still look right.
- Klondike / FreeCell / Spider **force landscape**; leaving releases the lock;
  other variants + the rest of the app rotate freely.
- (If #4 applied) multiplayer host/join still works.

## Still TODO before it's worth batching the build (optional)

- Pyramid + TriPeaks landscape layouts (pure JS — can land before the build so
  they're testable, but they're not blockers for the build itself).

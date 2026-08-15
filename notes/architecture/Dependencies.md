---
verified: 2026-08-15
---

# Dependencies

Regenerated directly from `package.json`, not migrated from the archive — the archived
list predates the Firebase online-multiplayer addition and was missing all three
`@react-native-firebase/*` packages.

```
dependencies:
@react-native-async-storage/async-storage: ^2.2.0  (profile/save persistence — requires EAS build)
@react-native-firebase/app: ^25.1.0                (online multiplayer — anonymous auth + RTDB; requires EAS build)
@react-native-firebase/auth: ^25.1.0
@react-native-firebase/database: ^25.1.0
@react-navigation/native: ^7.2.2
@react-navigation/native-stack: ^7.14.11
@sentry/react-native: ~7.2.0               (crash/error reporting — native, requires EAS build; dsn currently null, see [[Build and Release]])
expo: ~54.0.35
expo-asset: ~12.0.13
expo-audio: ~1.1.1                         (sound effects — expo-audio, not the older expo-av; requires EAS build)
expo-clipboard: ~8.0.8                     (tap-to-copy IP — requires EAS build)
expo-constants: ~18.0.13
expo-dev-client: ~6.0.21
expo-haptics: ~15.0.8                      (haptic feedback — native, requires EAS build; see game/haptics.js)
expo-image-manipulator: ~14.0.8            (photo crop to 1:1 — Expo-native, no extra native module)
expo-image-picker: ~17.0.11                (camera roll + camera access — Expo-native)
expo-network: ~8.0.8
expo-screen-orientation: ~9.0.9            (runtime orientation lock — portrait app-wide, landscape for Solitaire; requires EAS build)
expo-status-bar: ~3.0.9
expo-system-ui: ~6.0.9
expo-updates: ~29.0.18                     (OTA updates channel)
fbjs: ^3.0.5
react: 19.1.0
react-dom: 19.1.0                          (web build only)
react-native: 0.81.5
react-native-edge-to-edge: ^1.8.1          (SystemBars — hide status + nav bars under edge-to-edge; requires rebuild)
react-native-gesture-handler: ~2.28.0      (drag-and-drop for Solitaire/Conquián; requires EAS build)
react-native-safe-area-context: ~5.6.0
react-native-screens: ~4.16.0
react-native-tcp-socket: ^6.4.1
react-native-udp: ^4.1.7
react-native-web: ^0.21.0                  (web build only)

devDependencies:
@babel/core: ^7.29.7
@babel/preset-env: ^7.29.7
babel-jest: ^29.7.0
jest: ^29.7.0                              (unit tests for pure game logic — `npm test`)
prettier: ^3.8.3
sharp: ^0.34.5                             (used by scripts/compress-cards.js)
```

`typescript` is intentionally absent — removed 2026-06-02, see [[CQ-13]]. No `.ts`/
`.tsx` files or `tsconfig.json` exist anywhere in the repo; don't run `tsc` (CLAUDE.md
§2.2).

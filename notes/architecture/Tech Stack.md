---
verified: 2026-08-15
---

# Tech stack

- **Framework:** React Native + Expo (custom dev build, NOT Expo Go)
- **Navigation:** React Navigation (native-stack)
- **Networking:** *Local* — `react-native-tcp-socket` (port 7777) + `react-native-udp` (port 7778 discovery) + `expo-network`. *Online* — `@react-native-firebase/app` + `/auth` (anonymous) + `/database` (Realtime Database room codes). `game/GameNetwork.js` picks the transport via `setNetworkMode` — see [[GameNetwork]].
- **Build system:** EAS Build (Expo's cloud build service)
  - **EAS is the only working build path on this machine.** No local Android toolchain — `adb` isn't on PATH, the Android SDK isn't set up, so `npx expo run:android` fails and can never install a native build. The dev client on the phone always comes from EAS.
  - **Native-module changes** (anything in `app.json` plugins, or a dep with a native side like `react-native-edge-to-edge`, `react-native-tcp-socket`, async-storage, etc.) only take effect after a fresh EAS build is installed: `eas build --profile development --platform android`, install the printed APK, then `npx expo start --dev-client`.
  - **Pure-JS changes** hot-reload instantly over Metro — no build needed. Running against an old binary that lacks a newly-imported native module crashes the app. Batch native changes and rebuild once (CLAUDE.md §3.4).
  - See [[Build and Release]] for current build/submission status.
- **Source control:** Git + GitHub (`hardrockpdc/card-game-app`)
- **Package ID:** `com.pedro.cardgameapp`
- **App display name:** Card Night

See [[Dependencies]] for the current full dependency list (regenerated from `package.json`, not migrated) and [[Current Project Structure]] for the file tree.

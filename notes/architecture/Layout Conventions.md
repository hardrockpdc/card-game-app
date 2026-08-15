---
verified: 2026-08-15
---

# Layout conventions

- Use `SafeAreaProvider` at the app root.
- Use `SafeAreaView` from `react-native-safe-area-context`, not the deprecated React
  Native version. Confirmed: 23 of today's 35 screens use it, all correctly sourced —
  see [[CQ-9]] for the full audit (including which of the other 12 screens don't need
  it and why).
- Make key screens responsive with `useWindowDimensions()`.
- Prefer `ScrollView` for screens that may overflow on smaller phones.
- Avoid absolute positioning for important buttons or navigation links unless there is
  a strong reason.
- **Orientation:** the app is portrait-locked app-wide, with Solitaire the sole
  landscape exception (runtime `expo-screen-orientation`, pure JS). Responsive
  *sizing* (`game/useLayoutMode.js`) still adapts within the locked orientation. Full
  rule + rationale: [[Responsive Layout and Orientation]].
- **Immersive mode:** `App.js` renders `<SystemBars hidden style="light" />` from
  **react-native-edge-to-edge** to hide both the status bar and the navigation bar —
  the edge-to-edge-correct approach for SDK 54 (`expo-navigation-bar`'s visibility API
  is a deprecated no-op under edge-to-edge, which is on by default). A swipe from an
  edge reveals the bars briefly.

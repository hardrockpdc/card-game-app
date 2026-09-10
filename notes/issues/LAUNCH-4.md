---
id: LAUNCH-4
type: launch
area: build
status: fixed
severity: medium
opened: 2026-09-09
verified: 2026-09-09
evidence: "app.json:44-52 expo.plugins lists expo-audio, expo-image-picker, react-native-edge-to-edge, @react-native-firebase/app, @react-native-firebase/auth, ./plugins/withoutMediaPermissions, expo-font — no Sentry entry. @sentry/react-native ~7.2.0 is a dependency and installed, and ships the config plugin at node_modules/@sentry/react-native/expo.js, which nothing references. The JS side is complete: App.js:89 passes dsn: extra.sentryDsn into initErrorReporting, and game/errorReporter.js:46 returns early when the DSN is falsy, so today the SDK is never even required"
---

## Problem

**Setting `expo.extra.sentryDsn` will not be enough on its own — the Sentry Expo config plugin is missing.**

The checklist's remaining Sentry item reads as a one-value change: set the DSN, rebuild,
done. The JS wiring really is complete, so that reading is understandable. But
`@sentry/react-native` v7 in an Expo project expects its **config plugin** to be listed in
`expo.plugins`, and it is not. Nothing in the repo references
`node_modules/@sentry/react-native/expo.js`.

Two consequences, and the first is the one that matters:

- **Native crashes would likely go unreported.** The plugin is what configures the native
  Android side. Without it, a DSN gets you JS-level `captureException` — which is what
  `reportError` already funnels — while a native crash, the kind that kills the app with no
  JS to catch it, is exactly what you wanted crash reporting for.
- **Stack traces would be unreadable.** Source-map upload is also the plugin's job. A
  release bundle is minified, so reports would arrive as anonymous frames.

The net risk is a **false sense of coverage**: the console would show a configured project
and some JS errors arriving, which reads as "crash reporting is on" while the worst class
of crash is invisible.

## Not a blocker on its own

Nothing is broken today. With no DSN the reporter returns before the SDK is required
(`game/errorReporter.js:46`), so the app behaves exactly as it always has and the privacy
policy's "bundled but switched off and sends nothing today" is accurate.

## Also checked — the dev-only Sentry dialog is not a shipping risk

Every launch on a dev build shows an Alert reading "Warning, could not connect to Sentry
native SDK." That was worth chasing, because a dialog at startup would be user-visible.
It is not: the SDK guards it explicitly, in
`node_modules/@sentry/react-native/dist/js/client.js`:

```js
private _showCannotConnectDialog(): void {
  if (__DEV__ && this._options.enableNativeNagger) {
```

`__DEV__` is false in a release build, so it cannot appear in production. It is also not
triggered by this project's code — `initErrorReporting` never calls `Sentry.init` while
the DSN is null — so it comes from the dev client's own Sentry usage.

## Fix, when the DSN exists

Do it as one batch with the single rebuild the checklist already calls for (CLAUDE.md
§3.4), not as two:

1. Add the plugin to `expo.plugins` in `app.json`.
2. Set `expo.extra.sentryDsn`.
3. Supply the Sentry organization and project — the plugin wants them for source-map
   upload, and an auth token in CI. **Not yet known**, which is the other reason this is
   not actionable today.
4. Rebuild the dev client, then confirm a deliberate test error arrives in the Sentry
   console with a readable stack trace, before trusting it.

Deliberately not attempted early. Adding a native config plugin cannot be verified without
running a build, and a half-configured plugin can fail the build outright — worse than the
current honest no-op.


## Fixed 2026-09-09

`@sentry/react-native/expo` added to `expo.plugins`, and a real DSN set in
`expo.extra.sentryDsn`.

**The plugin takes no config here, deliberately.** Reading
`node_modules/@sentry/react-native/plugin/build/withSentry.js` settled how it should be
wired: every prop is optional, missing `organization`/`project` produces a one-line
warning and writes `# no org found, falling back to SENTRY_ORG environment variable`, and
an `authToken` passed in config is **deleted by the plugin itself** before anything is
written, with a warning telling you to use the environment variable. So the correct shape
is a bare plugin entry plus `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` supplied
at build time. That also keeps the auth token — the one genuinely secret value — out of
git by construction rather than by discipline.

Verified with `npx expo config --type prebuild`, which executes the whole plugin chain
rather than just parsing the file. Exit 0, config resolved, and the only stderr line is
the expected missing-org warning.

## What this dragged with it

Setting the DSN is the change that makes crash reporting real, so three documents had to
move in the same commit — the checklist had explicitly paired them:

- `docs/privacy.html` — the crash-reporting section said the SDK "is currently switched
  off and sends nothing". Now describes what actually leaves the device, and the
  "Last updated" date moved to 2026-09-09. Wording is drawn from the real init options
  (`tracesSampleRate: 0`, `enableAutoSessionTracking: false`, `sendDefaultPii: false`),
  not from what a crash reporter usually does.
- `notes/ops/App Store Review Notes.md` — claimed in two places that Sentry transmits
  nothing. Both corrected, with the versionCode 8 build called out as still transmitting
  nothing, since that is what is on the store today.
- `notes/product/Post-Launch Checklist.md` — item ticked, and a **new BLOCKING item**
  added for the Play Console Data Safety declaration.

## Still open, and it is not in the repo

Two things stand between this and working crash reporting:

1. **Rebuild the dev client.** Sentry is a native module and the plugin changes native
   config, so nothing here takes effect until a rebuild (CLAUDE.md §2.5). Then throw a
   deliberate error and confirm it arrives with a readable stack trace — a resolving DSN
   is not evidence that reporting works.
2. **Declare Diagnostics → Crash Data in the Play Console.** Tracked on the checklist as
   blocking. The listing says no crash data is collected, which was true for versionCode 8
   and is false for anything built from this commit. Shipping without it is a
   labels-mismatch rejection, and a takedown risk after approval.

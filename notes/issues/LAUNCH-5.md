---
id: LAUNCH-5
type: launch
area: build
status: open
severity: medium
opened: 2026-09-10
verified: 2026-09-10
evidence: "Play Console review 2026-09-10: App content > Foreground service permissions declaration shows OVERDUE, compliance deadline 2024-01-31. app.json android.permissions does not list any FOREGROUND_SERVICE permission — it comes from node_modules/expo-audio/android/src/main/AndroidManifest.xml, which declares FOREGROUND_SERVICE and FOREGROUND_SERVICE_MEDIA_PLAYBACK plus two services (AudioControlsService, foregroundServiceType mediaPlayback; AudioRecordingService, foregroundServiceType microphone) and merges them into the app manifest"
---

## Problem

**Google Play wants a foreground-service declaration Card Night should not need, and the permission comes from a library rather than from this app.**

The console lists the declaration as overdue against a 2024-01-31 deadline. Nothing in
`app.json` asks for it: the declared permissions are `NEARBY_WIFI_DEVICES`,
`ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `INTERNET`, `CAMERA` and
`MODIFY_AUDIO_SETTINGS`. The source is `expo-audio`, whose manifest is merged in:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<service android:name=".service.AudioControlsService" android:foregroundServiceType="mediaPlayback" />
<service android:name=".service.AudioRecordingService" android:foregroundServiceType="microphone" />
```

Card Night uses `expo-audio` for **short sound effects** — card flips, deals — through
`game/sounds.js`. It has no background playback, no media notification, no lock-screen
transport controls, and it already opts out of recording (`app.json` sets
`microphonePermission: false` and `recordAudioAndroid: false` on the plugin).

## Two ways to clear it, and they are not equivalent

**Complete the declaration.** Free, minutes, no code risk — but it tells Google the app
runs a media-playback foreground service, which it does not. Declaring a capability that
is not used is the same category of inaccuracy as the crash-data label this project just
corrected, pointed the other way.

**Remove the permission.** Honest, and there is precedent right here:
`plugins/withoutMediaPermissions.js` already strips `READ_MEDIA_IMAGES` and friends that
`expo-image-picker` injects, for exactly this reason — Play flags permissions the app does
not need, and `android.blockedPermissions` does not reliably remove a same-manifest entry.
The same plugin shape extends to these two permissions.

Preferred: **remove**. It matches what the app actually does and it retires the
declaration rather than answering it.

## Risk, and why this is not done yet

Stripping the permissions is safe on its own. Stripping the two `<service>` entries may
not be — if `expo-audio` starts `AudioControlsService` when a sound plays, removing it
from the manifest turns a working sound effect into a runtime failure. Whether the
declaration clears with the permissions gone but the services present is also unverified.

So this needs a build and a device pass confirming sound effects still play, not a
config edit and an assumption. It is a small change with a real failure mode, which is
exactly the kind that deserves the device check rather than the shortcut.

## Not blocking iOS

Android-only. It blocks an Android production release whenever that happens; it has no
bearing on the App Store track.

## Also seen in the same review, filed here for now

The console shows a second warning: **"Your app uses deprecated APIs or parameters for
edge-to-edge."** `react-native-edge-to-edge` is in `expo.plugins`. No fix is proposed here
because none has been investigated — most likely it tracks an Expo/RN version bump rather
than anything in this repo. Recorded so it is not rediscovered from scratch.

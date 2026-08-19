---
verified: 2026-08-18
---

# App Store Review Notes — Card Night

> Paste the text in each section into the corresponding field in App Store Connect
> and the Google Play Console. This file is for your reference — do not ship it.

**Rewritten 2026-08-18.** The previous version of this file claimed the app had no
server, no accounts, and no crash-reporting SDK. All three were false: online
multiplayer runs on Firebase Realtime Database with Firebase anonymous auth
(`game/firebase.js`, `game/onlineRoom.js`, `game/onlineTransport.js`), and
`@sentry/react-native` is bundled and wired through `game/errorReporter.js`.
Submitting those claims would have been a misrepresentation to app review and would
have produced privacy labels that do not match app behavior — a rejection cause on
both stores and a takedown trigger after approval. Do not reintroduce the old
wording.

---

## What the app actually does with data

This is the source of truth for every privacy field on both stores. Verified against
the code on 2026-08-18.

**Never leaves the device** (AsyncStorage, `game/profile.js`): coin balance, game
statistics, achievements, unlocked themes and frames, saved games, settings, and the
stored profile (name + picture).

**Sent to Firebase, only during online multiplayer** (`game/onlineRoom.js`,
`game/onlineTransport.js`):

- Firebase anonymous auth UID — random per install, not tied to any account, email,
  or device identifier. The app has no login UI.
- Display name, max 24 characters (`rooms/$code/players/$uid/name`).
- Profile picture (`components/useMultiplayerAvatars.js`, `game/avatarTransmit.js`):
  a preset avatar ID, or — if the user set a custom photo — that photo resized to
  120px wide, JPEG quality 0.6, base64-encoded, sent once at game start.
- Room code, selected game, variant, tone, room status, and per-turn game state
  (cards, turns, scores) as JSON payloads.

Rooms are deleted when the host leaves (`onDisconnect` + explicit `remove`).

**Sent over local Wi-Fi, only during local multiplayer** (`game/GameNetwork.js`):
the same display name, picture, and game state, device-to-device over TCP 7777 /
UDP 7778. No server involved.

**Crash reporting:** `@sentry/react-native` is bundled and initialized through
`game/errorReporter.js`, but `expo.extra.sentryDsn` is `null` in `app.json`, so it
is a no-op and transmits nothing today. If a DSN is ever set, the Diagnostics
disclosures below and the privacy policy must both be updated in the same change.

**Not present at all:** ads, ad SDKs, ad identifiers (IDFA/AAID), analytics SDKs,
in-app purchases, real-money gambling, chat, location, contacts, microphone
recording.

---

## App Store Connect → App Review Information → Notes

```
Card Night is a family-friendly card game app with three modes: single player
against AI, local Wi-Fi multiplayer (phone-to-phone), and online multiplayer
(via Firebase).

DEMO FOR REVIEW (single device, no second device needed):
1. Launch the app.
2. Tap "Single Player."
3. Tap "Blackjack."
4. Place a bet and tap "Deal" to play a full hand.

All single-player games (Blackjack, Solitaire, Go Fish, Poker, Conquian,
Rummy, Last Card) run entirely offline on one device. Multiplayer requires two
or more devices and cannot be fully demonstrated on a single review device.

NETWORK USAGE:
- Online multiplayer uses Google Firebase (Anonymous Authentication + Realtime
  Database) to relay game state between players who share a room code.
- Local multiplayer opens a TCP socket on port 7777 and a UDP socket on port
  7778 for direct device-to-device communication on the same Wi-Fi network.
  These sockets never contact an external server. The
  NSLocalNetworkUsageDescription and NSBonjourServices entries are required
  for this LAN discovery feature.

DATA COLLECTED:
- Firebase anonymous authentication assigns each install a random ID so the
  game can distinguish players in a room. There are no user accounts, no
  login, and no email or phone number is ever requested.
- During an online game only, the player's display name and profile picture
  are written to the Realtime Database so other players in the room can see
  them. A custom profile photo is downscaled to 120px and sent once at game
  start. Room data is deleted when the host leaves.
- Coins, statistics, achievements and saved games are stored on the device
  only and are never uploaded.
- No advertising, no ad identifiers, and no analytics SDKs.
- A crash-reporting SDK (Sentry) is present in the binary but is disabled: no
  DSN is configured, so it transmits nothing in this build.

CAMERA AND PHOTO LIBRARY:
Requested only when the user chooses to set a profile picture. The original
photo remains on the device; a small copy is shared with other players in a
multiplayer game. Declining the permission does not limit any other feature.

PURCHASES AND GAMBLING:
No in-app purchases. Coins and chips are play money with no cash value and
cannot be purchased, sold, or cashed out. Blackjack and Poker use simulated
wagering with these virtual chips only.

CONTENT:
All card games use standard playing card rules. Who Am I? (the non-card party
mode) uses original, family-appropriate prompts — no licensed content, no
NSFW material. There is no chat or user-to-user free text.

Privacy policy: https://hardrockpdc.github.io/card-game-app/privacy.html
```

---

## App Store Connect → App Privacy (nutrition labels)

"Data Not Collected" is **not** an accurate answer for this app. Declare:

- **Identifiers → User ID** — the Firebase anonymous auth UID. Linked to the user:
  No. Used for: App Functionality. Used for tracking: No.
- **User Content → Photos or Videos** — the optional profile picture, shared with
  other players in a multiplayer game. Linked to the user: No. Used for: App
  Functionality. Used for tracking: No.
- **User Content → Other User Content** — the display name and in-game state.
  Linked to the user: No. Used for: App Functionality. Used for tracking: No.
- **Diagnostics → Crash Data** — declare only if `expo.extra.sentryDsn` is set in
  the build being submitted. It is `null` today, so omit it for now and revisit
  this line before any build that enables Sentry.

Nothing is used for tracking, so the App Tracking Transparency prompt is not
required and `NSUserTrackingUsageDescription` is intentionally absent.

---

## Google Play Console → Release → Review notes (optional field)

```
Card Night — family-friendly card games with single-player, local Wi-Fi
multiplayer, and online multiplayer.

Online multiplayer uses Google Firebase (Anonymous Auth + Realtime Database)
to relay game state between players sharing a room code. Local multiplayer
uses TCP (port 7777) and UDP (port 7778) for direct phone-to-phone play on the
same Wi-Fi network, with no external server. The NEARBY_WIFI_DEVICES,
ACCESS_WIFI_STATE, and ACCESS_NETWORK_STATE permissions are required for this
LAN discovery feature.

Camera/photo permission is used only for an optional profile picture. The
original stays on the device; a downscaled copy is shared with other players
during a multiplayer game.

There are no user accounts or login, no ads, no ad identifiers, no analytics,
and no in-app purchases. Coins are play money with no cash value.

To test without a second device: tap "Single Player" -> "Blackjack" and play a
hand. All single-player modes work fully offline.

Privacy policy: https://hardrockpdc.github.io/card-game-app/privacy.html
```

---

## Google Play → Data safety form

Mirror the Apple labels above:

- **Data collected:** App activity (in-game state), Photos (optional profile
  picture), Personal info → Name (display name), Device or other IDs (Firebase
  anonymous UID).
- **Purpose** for all of the above: App functionality. Not shared with third
  parties for advertising; not used for tracking.
- **Data is encrypted in transit:** Yes (Firebase uses TLS).
- **Users can request deletion:** Room data is deleted automatically when the host
  leaves; on-device data is removed by uninstalling.
- **Digital purchases:** No. (Revisit if the freemium unlock in
  `notes/product/Post-Launch Checklist.md` ever ships.)

---

## Age rating

Blackjack and Poker include simulated wagering with virtual chips. Answer the
"simulated gambling" question on both questionnaires honestly — it will likely
push the rating above the lowest tier, which is a tension with the
family-friendly positioning in `CLAUDE.md` §4. Decide how to handle that before
filling in the form, not during. Understating it to keep a 4+ / Everyone rating is
the same class of mistake this file was rewritten to remove.

---

## Before Submitting — Checklist

- [x] Privacy policy URL live at https://hardrockpdc.github.io/card-game-app/privacy.html
      (GitHub Pages, `main` /docs — verified 2026-08-15 in [[LAUNCH-1]])
- [x] Privacy policy content matches actual app behavior (rewritten 2026-08-18)
- [ ] **Publish `database.rules.json` in the Firebase console** — blocking, see
      [[LAUNCH-3]]. Until this happens the shipped app is running against the
      pre-2026-08-02 rules.
- [ ] Confirm the demo flow (Single Player → Blackjack → bet + deal) works on a fresh install
- [ ] Verify camera permission dialog shows the correct description from app.json
- [ ] Confirm the local network permission dialog (iOS) shows on first multiplayer attempt
- [ ] Re-check the Diagnostics/Crash Data label if `expo.extra.sentryDsn` was set in
      the build being submitted

# App Store Review Notes — Card Night

> Paste the text in each section into the corresponding field in App Store Connect
> and the Google Play Console. This file is for your reference — do not ship it.

---

## App Store Connect → App Review Information → Notes

```
Card Night is a local multiplayer card game app. Players connect directly
phone-to-phone on the same Wi-Fi network or hotspot — no internet server is
involved at any point.

NETWORK USAGE (TCP / UDP):
The app opens a TCP socket on port 7777 and a UDP socket on port 7778 solely
for direct device-to-device communication on the local network. These sockets
are never used to contact any external server, send analytics, or transmit
personal data. The iOS NSLocalNetworkUsageDescription and NSBonjourServices
entries are required for this LAN discovery feature.

DEMO FOR REVIEW (single device):
1. Launch the app.
2. Tap "Single Player."
3. Tap "Blackjack."
4. Place a bet and tap "Deal" to play a full hand.

All single-player games (Blackjack, Solitaire, Go Fish, Poker, Conquián,
Rummy, Last Card) work completely offline on a single device. Multiplayer
requires two or more devices on the same network and cannot be demonstrated
on a single review device.

CAMERA PERMISSION:
The app requests photo library and camera access only for an optional profile
photo. The photo is stored locally on the device and is never uploaded anywhere.
Users who decline the permission can still use the app fully — the profile photo
field remains blank.

NO DATA COLLECTION:
- No user accounts or login
- No analytics or crash-reporting SDKs
- No ads or ad SDKs
- No data ever leaves the device or the local network
- Privacy policy: https://hardrockpdc.github.io/card-game-app/privacy.html

CONTENT:
All card games use standard playing card rules. Wild Round (the party game
mode) uses original, family-appropriate creative prompts — no licensed content,
no NSFW material.
```

---

## Google Play Console → Release → Review notes (optional field)

```
Card Night — local multiplayer card games

This app uses TCP (port 7777) and UDP (port 7778) exclusively for
phone-to-phone communication on the same Wi-Fi network. No external servers
are contacted. The NEARBY_WIFI_DEVICES, ACCESS_WIFI_STATE, and
ACCESS_NETWORK_STATE permissions are required for this LAN discovery feature.

Camera/photo permission is used only for an optional local profile photo,
stored entirely on the device.

To test without a second device: tap "Single Player" → "Blackjack" and play
a hand. All single-player modes work fully offline.

No data collection. No ads. No login required.
Privacy policy: https://hardrockpdc.github.io/card-game-app/privacy.html
```

---

## Before Submitting — Checklist

- [x] Privacy policy URL set to https://hardrockpdc.github.io/card-game-app/privacy.html (host the file separately)
- [ ] Confirm the demo flow (Single Player → Blackjack → bet + deal) works on a fresh install
- [ ] Verify camera permission dialog shows the correct description from app.json
- [ ] Confirm the local network permission dialog (iOS) shows on first multiplayer attempt

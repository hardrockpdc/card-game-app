# Card Night

A mobile card game app for playing with friends and family over local WiFi. No internet required — phones connect directly on the same network. Each player uses their own phone with a private hand.

**8 games included:** Blackjack, Go Fish, Texas Hold'em Poker, Conquián, Rummy (4 variants), Wild Round, Last Card, Solitaire (5 variants)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Expo CLI](https://docs.expo.dev/more/expo-cli/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- A physical Android or iOS device with the **Card Night dev build** installed (not Expo Go)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npx expo start --dev-client
```

Scan the QR code from the Card Night dev build app on your phone. Both your PC and phone must be on the same WiFi network (or use your phone as a hotspot).

---

## Multiplayer

- Open the app on two phones on the same WiFi
- One phone taps **Host Local** — the other taps **Join Local**
- Games are discovered automatically (no IP typing needed)

---

## Building for Store

Builds are handled via EAS. See `eas.json` for build profiles.

```bash
# Development build (for testing)
eas build --profile development --platform android

# Production build
eas build --profile production --platform all
```

---

## Project Docs

- [PROJECT_NOTES.md](PROJECT_NOTES.md) — full project state, architecture, roadmap, and coding patterns
- [CONQUIAN_SPEC.md](CONQUIAN_SPEC.md) — Conquián game rules and implementation spec
- [WILDROUND_SPEC.md](WILDROUND_SPEC.md) — Wild Round game rules and implementation spec

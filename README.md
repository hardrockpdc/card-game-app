# Card Night

A mobile card game app for playing with friends and family — same room over local WiFi (no internet required, phones connect directly), or apart over an online room code. Each player uses their own phone with a private hand.

**9 games included:** Blackjack, Go Fish, Texas Hold'em Poker, Conquián, Rummy (4 variants), Last Card, Solitaire (5 variants), Who Am I?, Memory Match

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

**Local (same room, no internet):**
- Open the app on two phones on the same WiFi
- One phone taps **Host Local** — the other taps **Join Local**
- Games are discovered automatically (no IP typing needed)

**Online (different locations, requires internet):**
- One phone hosts and shares a short room code
- Other players type the code in to join
- Backed by Firebase; requires anonymous sign-in, handled automatically

---

## Building for Store

Builds are handled via EAS. See `eas.json` for build profiles.

```bash
# Development build (for testing)
eas build --profile development --platform android

# Production build (Android only — distribution is Google Play only, see CLAUDE.md §5)
eas build --profile production --platform android
```

---

## Project Docs

- [CLAUDE.md](CLAUDE.md) — working agreement, hard technical rules, process discipline
- [notes/00 Index.md](notes/00%20Index.md) — the docs vault: architecture, product,
  design, ops, per-game specs, and the full issue tracker (open in Obsidian for live
  views via `notes/issues/00 Issue Board.md`)
- `archive/PROJECT_NOTES.md` — frozen historical tracker, kept as a reference baseline,
  no longer updated

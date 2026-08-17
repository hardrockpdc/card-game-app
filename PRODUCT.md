# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Groups of friends and family playing card games together — some in the same room over local WiFi (no internet needed, phones connect directly), some apart via an online room code. Public Play Store audience, not a private circle: growth, ratings, and retention are real product goals, not just personal convenience for the developer's own friend group.

## Product Purpose

Card Night lets a group play familiar card games together from separate phones, each with a private hand, either in person over local WiFi or remotely via an online room code. It exists to make casual, social card-game nights easy to run without a physical deck or table. Success means groups reliably start and finish a match together across devices, and come back for more — the coin economy, achievements, and ranks exist to reward repeat play.

## Positioning

Local WiFi multiplayer (no internet required, phones connect directly, no IP typing, auto-discovery) with private per-player hands — most casual card-game apps assume single-player-vs-AI or require internet for any multiplayer at all. Pairing that with a real online room-code mode means one app covers both same-room and apart-together card nights.

## Operating Context

- 9 games across 9 screens: Blackjack, Solitaire (5 variants), Conquián, Rummy (4 variants), Go Fish, Poker (Texas Hold'em), Last Card, Who Am I? (multiplayer party game, no cards), Memory Match (single-player).
- Two multiplayer transports: local (TCP/UDP over WiFi, auto-discovery) and online (Firebase-backed room codes, anonymous auth).
- Each player uses their own phone with their own private hand.
- Portrait-locked throughout except Solitaire (landscape-locked).
- Runs via a dev build (expo-dev-client) — several native modules mean it does not run in plain Expo Go.

## Capabilities and Constraints

- Distribution is Android-only via Google Play. The codebase stays cross-platform React Native/Expo on purpose — that's a distribution decision, not a code-level constraint, and cross-platform code/config should not be stripped.
- Family-friendly content rating is a hard constraint: no mature content, no real-money gambling. A prior party game (Wild Round) was removed specifically to protect this rating.
- Coin economy is cosmetic-only and earned-only: no real-money purchases, no loot boxes, no pay-to-win. Coins buy card-deck skins, table felts, and profile frames only.
- Undecided/open: a possible future one-time paid unlock for online play, deliberately kept separate from the coin economy — not yet built or committed.
- JavaScript only, no TypeScript in this project.

## Brand Commitments

- Name: Card Night.

## Evidence on Hand

- No Play Store listing copy, screenshots, press coverage, or testimonials on hand yet. Future work must not fabricate reviews, install counts, or user quotes.
- Privacy policy is live (required for Play submission): https://hardrockpdc.github.io/card-game-app/privacy.html

## Product Principles

- Casual and social first: friction that gets in the way of starting a game with the people in front of you (or apart) is the main enemy.
- Family-friendly always wins over feature richness — no mechanic ships if it risks the content rating.
- Cosmetic-only monetization: never let progression or coins create a pay-to-win or gambling-adjacent feel.
- Cross-platform code is kept even though only Android ships, to preserve future optionality cheaply.
- Public product, not a private toy: decisions should hold up for strangers discovering it on Play Store, not just the developer's own friend group.

## Accessibility & Inclusion

- Reduced-motion is required for every animation (`AccessibilityInfo.isReduceMotionEnabled()`, snap to final state) — established in `components/Card.js` and `SolitaireGameScreen.js`.

---
verified: 2026-08-16
---

# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

Card Night has **three co-equal audiences** — no single one is primary, and design
work must not optimize one at the expense of the others:

1. **A family in one room.** Parents, kids, relatives around a table or on the
   couch, each holding their own phone on the same WiFi. Every player has a
   private hand; the phones are the cards.
2. **Friends and family who are apart.** Different houses, different cities.
   They meet in an online room via a short room code.
3. **A solo player with downtime.** Solitaire, Memory Match, Blackjack, or a
   bot game, alone, for a few minutes.

Consequence: a screen that only makes sense with 4 people present, or only makes
sense alone, is a design failure. Entry points for all three must stay legible
from the Home screen.

## Product Purpose

A single Android app containing nine card and party games, playable alone, with
people in the same room over local WiFi, or with people elsewhere over an online
room code. It exists so a group can sit down and play a real card game without
anyone owning a deck, and so one person can play alone without downloading a
second app. Success is a group choosing it again next time.

## Positioning

Four claims, all confirmed by the user, all true of the shipped app:

- **Nine games, one download.** Blackjack, Solitaire (5 variants), Conquián,
  Rummy (4 variants), Go Fish, Poker, Last Card, Who Am I?, Memory Match — not
  nine separate installs each with its own ads and account.
- **Family-safe by construction.** No gambling, no real-money purchases, no loot
  boxes, no ad sludge. Safe to hand to a child unsupervised.
- **Real same-room multiplayer.** Each player holds a private hand on their own
  device, over local WiFi, with **no internet connection at all**. Most
  competitors cannot do this; it is the hardest claim to copy.
- **It feels good to play.** Card deal/flip animations, switchable decks and
  table felts, profile frames, a coin progression. Most free card apps look and
  feel cheap; the craft is part of the product, not decoration.

## Operating Context

- **Same-room play:** phones on one WiFi network (or one phone's hotspot). One
  player hosts, others join; discovery is automatic, no IP typing. Devices are
  passed around, propped up, and glanced at from odd angles across a table.
- **Remote play:** an online room code is spoken or messaged to the other
  players, who type it in. Requires internet and anonymous Firebase auth.
- **Solo play:** short sessions, often one-handed, often interrupted. Games
  auto-save and resume.
- **Mixed ages in one session.** A player who has never used the app may be
  handed a phone mid-setup and expected to keep up.
- **Sessions are interrupted.** Backgrounding, WiFi blips, and a player walking
  away mid-hand are normal, not edge cases; the app has a reconnect/pause system
  built specifically for this.

## Capabilities and Constraints

**Stack:** React Native 0.81.5, Expo SDK 54, React 19.1.0. JavaScript only —
there is no `tsconfig.json` and the project is not TypeScript. Dev build via
expo-dev-client; native modules do not work in Expo Go.

**Distribution:** Android only, via Google Play. This is a *distribution*
decision, not a *code* decision — cross-platform React Native code, iOS config,
and `Platform.select` branches stay intact so iOS remains possible later. Do not
strip them to "simplify."

**Games (9):** Blackjack, Solitaire (Klondike/FreeCell/Spider/Pyramid/TriPeaks),
Conquián, Rummy (4 variants), Go Fish, Poker, Last Card, Who Am I? (party game,
no cards), Memory Match (single-player).

**Networking:** one façade (`game/GameNetwork.js`) over two transports — local
TCP/UDP for same-WiFi play, Firebase Realtime Database for online rooms. Private
per-player state lives under a separate top-level `privateNet/*` path, never
under `rooms/*`.

**Coin economy:** entirely local (AsyncStorage), never in Firebase. Earned
through wins, a daily-bonus streak, and 15 achievements. Spent only on
cosmetics: card decks, table felts, profile frames. Ranks are prestige off
lifetime earned.

**Orientation (current policy, not a locked constraint):** portrait-locked
everywhere except Solitaire, which is landscape-locked. Responsive sizing via
`useLayoutMode()` applies within the locked orientation. The user explicitly did
*not* mark this as unbreakable — it can be revisited, but changing it is a
deliberate decision, not a side effect.

**Undecided / open:** a one-time paid unlock for online play has been discussed
and deliberately kept separate from the coin economy. Not built, not committed.

## Brand Commitments

- **Name:** Card Night. Package `com.pedro.cardgameapp`.
- **Voice:** plain, warm, all-ages. No gambling language, no aggressive
  monetization prompts, no dark patterns.
- **Colour roles** (tokens in `game/colors.js`): `#7fb3ff` blue accent,
  `#ffd700` gold for coins, `#2e9e54` green for primary actions, `#4caf50` for
  positive states, `#e94560` for errors.
- **The Home screen's casino red is deliberate.** `#e94560` fills the hub's
  Multiplayer CTA, and that is a confirmed choice (2026-08-03), not drift: the
  hub should feel like game night, not a settings screen. It is tokenised as
  `brandRed`, kept separate from `error` even though they currently share a
  value, because they are separate ideas and only one is free to change. The
  same literal used to also serve as a neutral count badge and a positive "your
  turn" banner; those now use their own roles.
- **Established visual direction:** flat card-emblem tiles (dark tile, accent
  color, suit motif, corner pips) for game selection on all three picker screens.
  This replaced AI photo thumbnails and is a deliberate, current choice.
- **Motion is part of the brand.** Cards deal and flip; this is spec'd in
  `Animations.md`. Every animation must respect `AccessibilityInfo.isReduceMotionEnabled()`
  and snap to its final state when reduced motion is on.

## Evidence on Hand

- Nine shipping games, device-tested; v8 approved for closed testing on Google
  Play, versionCode 9 / version 1.1.0 staged for the next production build.
- 515 unit tests across 41 suites (`npm test`, Jest, pure game logic only).
- Card art sets in `assets/` (classic, girly, gothic, pirate, wizards, cowboy,
  lastcard) backing the purchasable deck themes.
- Extensive in-repo documentation: [[00 Index]] is the entry point; [[product/Coin Economy]],
  [[design/Animations]], [[specs/Database Rules]], and per-game specs under `notes/specs/`.
  `archive/PROJECT_NOTES.md` is the frozen original tracker, kept as a diff baseline.
- **No testimonials, no user counts, no reviews, no press.** None exist. Future
  work must not fabricate any.
- **`README.md`** lists the correct 9 shipped games (fixed in the phase-3
  restructure, 2026-08-15) and now covers online play too (2026-08-16). `CLAUDE.md`
  and [[00 Index]] remain the deepest sources.

## Product Principles

1. **Three audiences, no favorite.** Solo, same-room, and remote play are equally
   real. Never make one the default path at the cost of the other two.
2. **Family-safe is a hard floor, not a preference.** Content, copy, and assets
   stay appropriate for all ages. A feature that would raise the content rating
   gets cut — this already happened once (Wild Round was removed for exactly
   this reason).
3. **Coins are earned, never bought.** No real-money coins, no loot boxes, no
   pay-to-win. Cosmetics only. This is what keeps principle 2 true.
4. **Offline must keep working.** All single-player and all local-WiFi
   multiplayer run with no internet connection. Online is additive; it never
   becomes a requirement.
5. **Craft is the product.** The animation, the card art, the felt, the frames —
   these are the reason someone picks this over a free clone. Cheapness is the
   competitor's problem, not ours.

## Accessibility & Inclusion

- **Reduced motion is required, not optional.** Every animation checks
  `AccessibilityInfo.isReduceMotionEnabled()` and snaps to its end state.
  Established pattern in `components/Card.js` and `SolitaireGameScreen.js`.
- **Mixed-age, mixed-experience groups.** A first-time player may be handed a
  phone mid-game; labels and states must read without prior context.
- **Table-distance legibility.** Phones are glanced at from arm's length and odd
  angles during same-room play; sizing goes through `scale()` / `scaleFont()`.
- No formal standard (WCAG level, screen-reader certification) has been
  committed to yet.

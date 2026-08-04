---
target: HomeScreen, OnboardingScreen, SinglePlayerSetupScreen, LastCardGameScreen
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-08-03T00-31-39Z
slug: screens
---
Method: ⚠️ DEGRADED: single-context for Assessment B (detect.mjs reads HTML/CSS and returns `[]` on React Native source — structurally inapplicable, not clean). Assessment A ran as an isolated sub-agent. A source-level mechanical scan substituted for B.

Surfaces: `screens/HomeScreen.js`, `screens/OnboardingScreen.js`, `screens/SinglePlayerSetupScreen.js`, `screens/LastCardGameScreen.js`. Mode: Operate.

## Design Health Score — 23/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Persistent turn indicator is the smallest text on the game screen (10px); the loud one auto-hides at 1500 ms. |
| 2 | Match System / Real World | 2 | Wild colours named "OD Green", "Crimson", "Turquoise", "Coral" — paint-chip jargon in a family game. |
| 3 | User Control and Freedom | 2 | Onboarding never decrements `step`; hardware Back exits the app and discards the typed name. |
| 4 | Consistency and Standards | 2 | Three live design eras; `#e94560` is error, primary CTA, neutral badge and positive banner at once. |
| 5 | Error Prevention | 2 | Onboarding Next is dimmed but not `disabled`; five 3,000-coin decks handed out free. |
| 6 | Recognition Rather Than Recall | 2 | Eight tiles differ only by accent colour; the `tag` metadata that would help is computed, never rendered. |
| 7 | Flexibility and Efficiency | 2 | Mandatory "Ready to play?" confirm on every launch; no resume-from-Home. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained and handsome; docked for three redundant profile affordances on Home. |
| 9 | Error Recovery | 3 | ReconnectOverlay is excellent; docked because a non-host who loses gets one button, "Main Menu". |
| 10 | Help and Documentation | 3 | HowToPlay is real and illustrated; docked for no in-context "why can't I play this card?". |
| **Total** | | **23/40** | **Acceptable — significant work needed** |

## Design Specificity Verdict

Two of four screens are genuinely product-specific; two are category-interchangeable. The set does not read as one system — it reads as three design eras stacked.

Era A "casino red" (`HomeScreen`, `MultiplayerMenuScreen`): `#e94560` as primary action, red text-shadow glow, elevation 5.
Era B "cool slate" (`GameSetupLayout`, `GameHeader`, `GameMenu`): `#0f1115`/`#243042`, `#77AEF7` accent, flat.
Era C "navy card" (`EndOfRoundModal`, `SinglePlayerSetup`, `Onboarding`): `#16213e` on `#1a1a2e`, `#2e9e54` green primary, `#7fb3ff`.

PRODUCT.md commits to Era C. But Era C wins only in the two most recently touched screens. HomeScreen — the screen every user sees most, where the three audiences diverge — is entirely Era A.

Colour semantics are inverted on the hub: `#e94560`, documented as error red, fills the Multiplayer button. Green `#2e9e54`, documented as primary, fills Single Player. The strategic bet is painted in the error colour and ranked second.

## Priority Issues

### P0-1 — Multiplayer Last Card pays nothing
`LastCardGameScreen.js:329` opens the reward effect with `if (!isSinglePlayer) return;`. `addCoins`, `recordWin`, `recordAchievementEvent` and the win/lose haptic never run in multiplayer. Line 334 computes `getWinReward("lastcard", !isSinglePlayer)` — the MP tier — and it is unreachable. Line 1392: `coins={isSinglePlayer && winner === myPid ? coinsEarned : 0}`.
Two of three co-equal audiences are locked out of the reward loop in this game, in the mode whose payouts are meant to be 2–2.5× solo.
Fix: split the effect; keep `clearGame` solo-only, let the reward block run for any `winner === myPid` guarded by `coinRewardedRef`. Each device rewards its own player. Audit Go Fish, Conquián, Rummy, Poker, Who Am I? for the same early return.

### P0-2 — Onboarding gives away 15,000 coins of decks
`OnboardingScreen.js:333` feeds the carousel the unfiltered `THEMES_LIST`. Five of seven decks cost 3,000 (`cardTheme.js:23-27`). No lock, no price, no label. `handleFinish:113-114` calls `setTheme(key)` + `updateProfile({cardTheme:key})` with no unlock check, and `isThemeUnlocked` grandfathers `id === activeTheme`, so the choice is permanent.
The largest sink in a cosmetic-only, earned-only economy is emptied on step 3 of first run. It also breaks the app's own rules with itself: `CardThemeScreen` shows locks and prices; onboarding shows neither.
Fix: filter to `getThemePrice(key) === 0`, or render paid decks with a `🔒 3,000 🪙` badge, non-selectable.

### P1-1 — Onboarding is a one-way corridor that can lose the user's name
`setStep` is called at lines 96, 116, 222, 307, 312 — every one moves forward. No back control on any step. `saveProfile` doesn't run until `handleFinish` at step 3→4. Onboarding is the stack root with `headerShown: false` and registers no `BackHandler`, so hardware Back on step 2 or 3 exits the app and discards the name. The counter reads "STEP 1 OF 3" through "STEP 3 OF 3" while `step` runs 0–4.
Fix: back control + `BackHandler` decrementing `step`; persist the name draft; `disabled={!nameDraft.trim()}` instead of dim-and-alert; fix the counter.

### P1-2 — Last Card gives no legal-move affordance by default and no reason on rejection
`:1312` gates dimming on `difficulty === "easy"`; the default is `"medium"`. Illegal tap shakes and buzzes with no status text. Deck tap with a legal card in hand returns silently. Hand cards carry no accessibility labels, so a screen-reader user cannot play at all.
A legibility affordance is bound to a challenge dial. Those are different requests from different people.
Fix: always dim unplayable cards; make Hard mean a harder AI. Add a status line naming the rule on rejection, and accessibility labels on hand cards.

### P1-3 — Backgrounding kills local WiFi multiplayer
`App.js:161-173` skips teardown only when `getNetworkMode() === "online"`. In local mode, backgrounding calls `stopServer()`, `stopBroadcasting()`, `stopDiscovery()`, `disconnectFromHost()`. Checking a text mid-game tears down the connection for the same-room audience, and `useOnlineReconnect` covers only the online path.

### P2-1 — Three exits from a game, three outcomes, contradictory copy
Hardware Back says "progress will be saved" and saves. Menu → ❌ Quit says "progress will be lost" and deletes. Menu → 💾 Save & Exit saves. Two of these sit adjacent in one 7-item menu with opposite consequences, and the destructive one is visually terminal.

## Cognitive Load — 5 of 8 failures (critical)

Failures: single focus (Home asks four unrelated questions); chunking (8 ungrouped tiles); visual hierarchy (10px persistent vs 28px transient turn state); one thing at a time (achievement `Alert` can stack over `DailyBonusModal` from the same `useFocusEffect`); minimal choices.
Passes: visual grouping, working memory, progressive disclosure.

Decision points over 4 options: Home (6 targets), Choose Game (8 tiles), Multiplayer menu (5, four near-identical red buttons), onboarding avatar grid (full set at once), onboarding decks (7), GameMenu (7 actions).

## Persona Red Flags

**Jordan (first-timer):** onboarding lists 7 solo games, the grid ships 8 (Memory Match omitted). "STEP 1 OF 3" but five screens. Step 2's Skip and Next→ do the identical thing. Picks the Pirate deck free, later sees 🔒 3,000 on it. Taps Rummy expecting a game, gets a variant picker. In Last Card: taps a card, shake and buzz, no text; taps the deck, nothing at all. Most likely abandonment point in the app.

**Casey (one thumb, interrupted):** Home's primary actions are vertically centred, not thumb-zone; only How to Play and ✕ Quit are reachable. Backgrounding kills local MP (P1-3). No "Continue" on Home — four screens to resume a saved game. Returns after 30 s and the turn banner has expired, leaving 10px grey type.

**Nora (grandparent at the table):** eight ~124×166 dark tiles distinguished by a 0.2-opacity ghost suit and 17px name, at arm's length without glasses. Unplayable cards not dimmed — she taps, it shakes, it buzzes, the whole table sees it, and she won't ask. Asked to pick "OD Green" behind a full-screen black overlay that hides her hand. On Home, ✕ Quit and 📖 How to Play are the same size, same row, 8px apart.

## Minor Observations

- `triggerShake` (`LastCard:395-425`) has no reduce-motion guard — violates CLAUDE.md §2.4. Also flagged in the 2026-08-02 audit, still open.
- `SinglePlayerSetup`: `tag` data (`:16-23`) and `flatTileTag` style (`:451`) both exist, neither rendered.
- Tile ratio `tileW = min(cellW, cellH * 0.75)` leaves ~49px dead horizontal space per cell.
- Suit motifs repeat exactly twice each across 8 tiles — the motif discriminates nothing; accent colour is the sole differentiator, which fails for red-green deficiency.
- Dead styles: `HomeScreen:426-444`, `LastCard:1644-1675`, `MultiplayerMenu:183-204`.
- `cardTitle` and `cardLabel` (`LastCard:126-146`) are byte-identical functions, both live.
- Four unrelated purples: `#7c6cff`, `#6a5acd`, `#7878ff`, `#5555cc` — none in the stated palette.
- `swipeHint` is `#444` on `#1a1a2e` — roughly 1.4:1, effectively invisible, and it's the carousel's only affordance.
- `seatBar` horizontal ScrollView: 7 opponents ≈ 588px of content on a 390px screen, no scroll indicator, `justifyContent: "center"` splitting overflow off both edges.
- Nine type sizes at 13px or below across the four screens, four at `scaleFont(10)` → 9px on a small phone.
- Onboarding: 24 touchables, 0 accessibility props. SinglePlayerSetup: 13 touchables, 0.

## Questions to Consider

1. Home asks "which mode?" — network topology. The real 7pm question is "just me / everyone's in this room / Grandma's at her place." What if Home asked the social question and inferred the topology?
2. Why pick the game before the mode? A family with four people and one hour needs the intersection, filtered by player count and length.
3. The `tag` field is written and never rendered. What else does the code already know that the UI hides — save state, last played, win counts, whether a game fits the number of people in the room?
4. Why is "dim the cards I can't play" a difficulty setting? What else conflates *harder opponent* with *less help reading the screen*?
5. The app is called Card Night, the game is Last Card, and reaching one card is a font-size-11 numeral. If you designed only that moment — pulse, sound, status line, a haptic on every device in the room via the network layer you already have — would it beat the next three screens of polish?
6. `#e94560` means error, multiplayer CTA, draw-pile badge and "Your Turn!". If a colour means four things it means nothing. What would Home look like with multiplayer in the accent blue you already committed to?

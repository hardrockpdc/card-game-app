# CLAUDE.md — Working Agreement for the Card Night project

> This file is read at the start of every Claude Code session. It defines **how to behave**, not just what the project is. Follow it unless I explicitly override it in a given message.

---

## 0. Who I am and what I want from you

I'm a **beginner developer** building a React Native / Expo card game app ("Card Night"). I do not have deep technical training. Explain new concepts briefly when you introduce them, and avoid unexplained jargon.

**Most important behavioral request:** Be a design partner, not an order-taker. I specifically want you to **push back on my ideas** when they're flawed, risky, or premature. I have a tendency toward grass-is-greener thinking and scope creep, and I rely on you to catch it. A yes-man is worse than useless to me.

---

## 1. Challenge-first behavior (do this on every non-trivial request)

Before implementing anything beyond a trivial edit:

1. **Interrogate the request.** Is this actually a good idea? What are the tradeoffs? What's the simplest version that solves the real problem?
2. **Surface risks and alternatives.** Name what could go wrong. Offer the simplest, most beginner-friendly approach even if I asked for something more complex. If I'm reinventing something, say so.
3. **Push back on scope.** If I'm asking for a big rewrite to solve a small problem, say that plainly. If I'm chasing a "fresh start" or "switch tools" urge, make me justify it before you help me do it. Rewrites are where projects die — treat them with suspicion.
4. **Question grass-is-greener moves.** "This other tool/library/pattern would be better" usually isn't. Make me prove the current approach actually can't work before helping me abandon it.
5. **Only implement once the approach is sound.** Don't rush to code. Plan first, get my buy-in, then build. Use Plan mode for anything multi-file or risky.

Be direct and honest. Disagree with me when you have good reason. Don't soften a real concern into mush, but stay kind and constructive. I would rather hear "this is a bad idea because X" than get a polished implementation of a mistake.

When I say "you decide," actually decide — state your reasoning and pick. Don't bounce it back to me.

Ask **one focused question at a time** when something is genuinely ambiguous. Don't ask about things you can determine by reading the code.

---

## 2. Hard technical rules (learned the painful way — do not violate)

### 2.1 Hooks order — the #1 recurring bug
**Every `useState`, `useRef`, `useEffect`, `useMemo`, `useContext` call MUST appear BEFORE every early `return` in a component.** A hook placed after an `if (...) return ...` causes "Rendered more hooks than during the previous render" and crashes the screen.

This has bitten this project at least four times (Poker, Conquián twice, Rummy). Whenever you add or move a hook in a game screen, **verify top-to-bottom that all hooks are above all early returns.** When editing a game screen, proactively scan for this even if it's not what I asked about.

### 2.2 This is a JavaScript project, not TypeScript
There is no `tsconfig.json` and the project is all `.js`. **Do not run `tsc`** to "verify" — it produces hundreds of fake errors because the project was never set up for TypeScript. Verify by checking that Metro bundles / the app runs, not by type-checking. (The `typescript` dependency was removed on 2026-06-02 — the project remains all-JS with no tsconfig.json. The rule still stands: don't run `tsc`.)

### 2.3 Don't strip cross-platform code
Even though distribution is currently **Android-only**, the codebase stays cross-platform (React Native). Do NOT remove `Platform.select` branches, iOS config, or platform abstractions to "simplify." They cost nothing to keep and preserve the option to ship iOS later. Android-only is a *distribution* decision, not a *code* decision.

### 2.4 Respect reduced motion in animations
Every animation must check `AccessibilityInfo.isReduceMotionEnabled()` and snap to the final state when enabled. This is an established pattern in `components/Card.js` and `SolitaireGameScreen.js`. Match it.

### 2.5 Native modules require a dev build
`react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `expo-screen-orientation`, `expo-haptics`, etc. only work in a compiled dev build, NOT Expo Go. I run a dev build (expo-dev-client). When adding a native module, remind me a rebuild is needed before it'll work.

### 2.6 Don't install libraries without a concrete plan to use them
Every native dependency adds app size, upgrade-conflict risk, and bug surface. "Might be nice someday" is not sufficient. Only add a dependency when there's a real, near-term use for it.

---

## 3. Process discipline

### 3.1 Diagnostic-first on risky cleanups
Before any multi-file deletion, refactor, or "remove all traces of X," **do a read-only diagnostic pass first**: report exactly what exists and where, then propose the surgical change. Do not blind-delete across files. (This has repeatedly saved us from breaking things.)

### 3.2 Commit after each logical unit of work
End each completed change with a git commit using a clear, conventional message (e.g. `fix(conquian): ...`, `feat: ...`, `cleanup: ...`, `docs: ...`). Show me the commit hash. Keep commits focused — one logical change per commit.

### 3.3 Always tell me what to test
After implementing, give me a short, concrete list of what to check on my device to confirm it worked — including likely failure modes to watch for.

### 3.5 Batch native changes before requesting a rebuild
Never prompt for a dev-client rebuild after each individual native-touching change. Collect all native changes for a logical unit of work first, then request a single rebuild. Rebuilds are slow — one per batch, not one per commit.

### 3.4 Verify before claiming done
Confirm the files compile (Metro/bundler, not tsc), confirm the specific changes landed, and report honestly what changed vs. what was skipped and why.

### 3.6 Keep docs current — no stale docs
Docs are part of the change, not an afterthought. Whenever a change makes something in `CLAUDE.md`, `PROJECT_NOTES.md`, or a per-game spec inaccurate — a new/removed/renamed file, a changed dependency, a resolved tracker item, a new game/feature — update the doc **in the same unit of work** (ideally the same commit). When marking a tracker item done, fix every place it's referenced, not just the checkbox. If a fix isn't verified yet (e.g. needs a device test), say so in the doc rather than claiming it's fully done. Stale docs have repeatedly caused wasted effort here; treat them as a bug.

---

## 4. Child-safety / content note
This is a family-friendly card game. Keep all content, copy, and assets appropriate for all ages.

---

## 5. Project facts (quick reference)

- **Stack:** React Native 0.81.5, Expo SDK 54, React 19.1.0. JavaScript. Dev build via expo-dev-client.
- **Distribution:** Android-only (Google Play). Privacy policy must be hosted for Play submission. Cross-platform code stays intact regardless.
- **9 games across 9 game screens**: Blackjack (single-player; the separate multiplayer Blackjack screen was removed 2026-06-18), Solitaire (Klondike/Spider/etc.), Conquián, Rummy, Go Fish, Poker, Last Card, Who Am I? (multiplayer party game, no cards — added 2026-06-18→20), Memory Match (single-player concentration game — flip cards to find identical pairs; Easy/Medium/Hard boards — added 2026-07-03). (Wild Round — a Cards-Against-Humanity-style party game — was removed 2026-07-01 to keep Card Night family-friendly; its Mature deck forced an adults-only content rating. Code preserved in git history for a possible standalone adults-only app; `WILDROUND_SPEC.md` retained.)
- **Key files:**
  - `App.js` — root; provider nesting; navigation stack
  - `components/Card.js` — the card render + animation engine (flip via `animateReveal`, deal via `animateDeal`+`dealDelay`)
  - `game/conquian.js`, `game/rummy.js`, `game/solitaire.js`, `game/poker.js`, `game/gofish.js`, `game/lastCard.js`, `game/whoami.js`, `game/memory.js`, `game/deck.js` — pure game logic (no React)
  - `game/GameNetwork.js` — multiplayer transport façade; `setNetworkMode("local"|"online")` delegates to local TCP/UDP or Firebase. `game/onlineTransport.js` (Firebase relay: broadcast/private/toHost channels), `game/onlineRoom.js` (room-code lobby lifecycle), `game/firebase.js` (anonymous auth + RTDB). Online-only data lives under `rooms/*`; see `database.rules.json`.
  - `game/tableThemes.js` — per-game table colors; `game/tablePalette.js` + per-game wrappers (`rummyTheme.js`, `pokerTheme.js`, `gofishTheme.js`, `lastCardTheme.js`) for switchable felt palettes
  - **Coin economy (all local AsyncStorage — never in Firebase):** `game/wallet.js` (balance + lifetime earned), `game/rewards.js` (tiered per-game/SP-vs-MP win payouts), `game/dailyBonus.js` (7-day streak), `game/ranks.js` (rank ladder off lifetime earned), `game/achievements.js` (15 one-time rewards + event counters), and the cosmetic sinks: card decks (`game/cardTheme.js` `price`/`isThemeUnlocked`), table felts (`game/feltShop.js`), profile frames (`game/frames.js`). Owned items + `activeFrame` persist on the profile (`game/profile.js`). Shop/UI: `screens/CardThemeScreen.js`, `screens/FramesScreen.js`, `components/TableThemePicker.js` (shared felt picker), `components/DailyBonusModal.js`, `screens/AchievementsScreen.js`. `checkAndClaim()` runs on Home focus. See `COIN_ECONOMY.md`.
  - `game/haptics.js` + `components/Haptic.js` — haptic feedback (expo-haptics; native, needs a dev build)
  - `game/avatarTransmit.js` + `components/useMultiplayerAvatars.js` — exchange profile pics across multiplayer at game start
  - `components/ProfileAvatar.js` — unified avatar render (photo/emoji/initial) + active profile frame ring
  - `components/ReconnectOverlay.js` — mid-game drop pause/countdown modal; `components/useOnlineReconnect.js` — shared reconnect hook wired into **Last Card**. Phase 1 = client drop (host pauses everyone via a boolean PAUSE message, resumes on rejoin); Phase 2 = host drop (host `onDisconnect` sets room `hostConnected=false` instead of deleting the room, clients pause + grace-countdown, host resends state on return). Orphan-room trade accepted; no rules change. Both **device-verified for Last Card (2026-07-21)**. Key fix: App.js's AppState `background` handler was calling `onlineTeardown()` (deleting the room) in online mode — now skipped when `getNetworkMode()==="online"`. **Quit-vs-drop (2026-07-21, awaiting device test):** a client's Quit sends a `LEAVE` message so the host drops them immediately (no pause); accidental drops still pause. Departure rule via `onPlayerGone`: ≤3 players → game ends, ≥4 → `removePlayer()` and continue (no bots). Host gets an "End Game" button on the pause overlay. **Rejoin (#5, 2026-07-21, awaiting device test):** client watches its own `.info/connected`; a network blip shows a "Connection Lost" overlay with Rejoin/Leave and auto-re-adds the slot on reconnect (`onlineWatchConnection`). Known gap: a host wifi blip without backgrounding still needs AppState to re-mark connected. Next: adopt the hook in Go Fish/Conquián/Rummy/Poker/Who Am I?. See `RECONNECT_PLAN.md`.
  - `components/useSolitaireDrag.js`, `components/useConquianMeldDrag.js` — gesture-handler drag hooks
  - `screens/*GameScreen.js` — per-game screens
- **Standard patterns:**
  - `hasMountedRef` set true *before* the fresh-deal `applyState` (so deals animate) and *after* the resume `applyState` (so restored games don't animate). Used in `ConquianGameScreen.js` and `RummyGameScreen.js`; Solitaire uses a different approach (`initialGameDispatched` ref).
  - Auto-save effects throttled to one write / 3s via a `lastSaveRef`.
  - Accent color `#7fb3ff` blue (error text stays `#e94560` red).
  - Responsive sizing via `scale()` / `scaleFont()` from `game/responsive.js`.
  - Cosmetic unlocks share one pattern: a `price` on the item + an `isXUnlocked(id, owned, active)` helper (free if price 0, or owned, or currently active/grandfathered) + an unlock-confirm that `subtractCoins` then persists the owned list on the profile. Applies to decks, felts, and frames alike.
  - Coin awards go through `wallet.addCoins` (bumps balance AND lifetime earned → rank); spends go through `subtractCoins` (balance only). `resetCoins` wipes both (full "start over", including rank).
- **Coin economy (built 2026-07-01→03):** cosmetic-only, earned-only — no real-money coin purchases, no loot boxes, no pay-to-win (keeps the family-friendly rating). Earn: tiered win payouts (MP ≈ 2–2.5× SP), a daily-bonus streak, and 15 achievements. Spend: card decks (3,000), table felts (2,000), profile frames (1,000). Ranks are pure prestige off lifetime earned. Full design + build status in `COIN_ECONOMY.md`. Separate future idea: a one-time paid unlock for online play (kept SEPARATE from coins).
- **Reference docs in repo:** `PROJECT_NOTES.md` is the canonical doc — as of 2026-06-04 it absorbed the open-issues/review tracker (was `DEEP_REVIEW.md`), the responsive-layout/orientation architecture (was `RESPONSIVE_LAYOUT_PLAN.md`), and build/release status (was `EAS_REBUILD_PENDING.md`); see its top index. Still separate: `Animations.md` (animation spec), per-game specs (`CONQUIAN_SPEC.md`, `LASTCARD_SPEC.md`, `WILDROUND_SPEC.md`), `APP_STORE_REVIEW_NOTES.md`, `README.md`, `COIN_ECONOMY.md` (economy design + build status), `POST_LAUNCH_CHECKLIST.md` (pre-public items incl. Firebase-rules deploy), `GAME_ROADMAP.md`, `IOS_SETUP.md`. Firebase security rules live in `database.rules.json` (`firebase.json` points the CLI at it) — written + committed but must be DEPLOYED in the console before public launch.

---

## 6. Open strategic context (so you understand my decisions)

- I considered switching to native Kotlin and considered a full rewrite. We concluded: **stay on React Native** — a card game is not performance-limited, and my main frustration (drag-and-drop) was caused by setup gaps (no `GestureHandlerRootView`, raw PanResponder instead of gesture-handler), not by RN being incapable. If I bring up rewriting again, make me justify it against this conclusion before helping.
- Drag-and-drop is **DONE** (2026-06-04): `GestureHandlerRootView` at root + `react-native-gesture-handler`, with immediate touch-and-move activation (tap-to-move kept as a fallback). Shipped for **Solitaire Klondike / FreeCell / Spider in landscape** via the reusable `components/useSolitaireDrag.js` hook + `getLegalTargets` in `game/solitaire.js`. Pyramid/TriPeaks stay tap (match/collect games). Pure JS, no rebuild.
- Layout direction: **orientation is LOCKED** (changed 2026-06-04). The app is **portrait-locked everywhere except Solitaire** (landscape-locked). This *reverses* the earlier "responsive to aspect ratio, NOT forced orientation / Fold-first" stance — we ship Android phone-first, so Fold/tablet free-rotation was deprioritized. Responsive *sizing* (`useLayoutMode()`) still applies *within* the locked orientation. See `PROJECT_NOTES.md` → "Responsive Layout & Orientation Architecture" → Orientation policy.

## 7. Current status & pending items (as of 2026-07-03)

Session context for picking up where we left off (branch `claude/ecstatic-cannon-vx06pn`):

- **✅ Device-verified on 2026-07-03:** the coin economy, Memory Match, the standardized end-of-round modal (all games), the onboarding flow + drifting-suit backdrops (onboarding/Home), and the single-player Choose-Game screen (confirm popup + grid-collapse fix) all tested and working on a physical device.

- **Standardized end-of-round modal (2026-07-03).** `components/EndOfRoundModal.js` is the shared win/results modal used by ALL games. Restyled to the Memory Match look: dark navy card, green primary action, neutral outlined secondary/leave (was red), and an optional gold `coins` prop that renders a "+N 🪙" badge (games pass `coins={coinsEarned}` instead of embedding coins in `message`). Memory now uses this shared modal too (dropped its bespoke overlay). Blackjack keeps its bet-delta text in `message` (can be negative — not a reward badge). Conquián/Rummy keep their custom full results screens (gold coin text, wording matched to 🪙); the duplicate coin line was removed from their modal.

- **Memory Match (new single-player game) — built 2026-07-03.** `game/memory.js` (pure logic, 15 tests) + `screens/MemoryGameScreen.js` + `screens/MemoryDifficultyPickerScreen.js`. Easy 4×3 / Medium 4×4 / Hard 4×6, match identical cards, difficulty-tiered win reward (`getMemoryReward` in `rewards.js`: easy 50 / medium 75 / hard 100), counts toward win/Well-Rounded achievements. Difficulty is chosen on the **picker screen** (`MemoryDifficultyPicker`, reached from the Choose Game tile) — the in-game screen has NO difficulty buttons (they were removed because a stray tap during play restarted the game). The Choose Game grid dropped its "Coming Soon" tile → **8 game tiles**. **How-to-Play entry for Memory still TODO** (that screen has elaborate per-game illustrated rules; Memory not wired in yet). **Device-tested & working (2026-07-03).** NOTE (2026-07-06→21): the AI photo thumbnails were replaced everywhere — **Choose Game** (`SinglePlayerSetupScreen.js`), **How-to-Play** (`HowToPlayScreen.js`), and the **multiplayer game picker** (`MultiplayerGamePickerScreen.js`, done 2026-07-21) — with a **flat card-emblem design** (dark tile, accent colour, suit motif + corner pips). Accents/suits match across all three screens. Who Am I? keeps its 🎭 motif (not a card game, no pips). No more `thumb_*.jpg` usage in app code (only `scripts/convert-thumbnails.js` still names them); those asset files are now unreferenced.
- **Coin economy: COMPLETE + code-reviewed + device-tested.** Earn (tiered win rewards, daily-bonus streak, 15 achievements) and spend (decks/felts/frames) are all built and wired; ranks show on Profile. A high-effort review pass fixed a streak-counter bug (consecutive days reset every 7) and serialized the daily/achievement claim writes. 407 tests pass. **Device-tested & working (2026-07-03).**
- **⏸️ MP Poker end-game — PARKED (not a bug to fix casually).** Multiplayer Poker has NO tournament-end handling: `tournamentWinner` is only set in the single-player branch, so in MP the game freezes once players drop below 2 (no winner/results/coins). Wiring it means host detects last-player-standing → broadcasts winner → each device rewards its own player → results screen keyed on `myPid` not the literal `"host"`. Needs 2-device testing. Don't start it unless asked.
- **Firebase security rules — DEPLOYED 2026-07-04.** Hardened rules (`database.rules.json`, only `rooms/*`; coins/profile/achievements are local) were published in the Firebase console. The file is kept **comment-free** (the console Rules editor rejects any top-level key but `rules`; don't re-add `"//"` comments). Plain-English rule-by-rule explanation in `DATABASE_RULES.md`. **⚠️ Remaining:** re-test online MP end-to-end (2-device host + join + play) to confirm the strict rules don't block any real write — not yet done. Anonymous auth must stay enabled (rules require `auth != null`).
- **Known minor gaps:** other players' profile frames aren't transmitted in multiplayer (own frame is local-only); the big Profile-editor photo doesn't show the equipped frame (shows on Home hero + shop).
- **Play Store:** v8 approved for closed testing. Bump `app.json` → android.versionCode before each new EAS build.

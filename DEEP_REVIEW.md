# 🔍 Card Night — Deep Code Review v3 (2026-05-17)

> **Fresh full-structural sweep** after the animation work. The v2 doc is fully resolved
> and is archived alongside this one as `DEEP_REVIEW_v2_archive.md` for reference.
>
> This review covers: bugs + code quality + UX + performance + accessibility +
> app-store readiness — same wide scope as v2, with full beginner-friendly
> walkthroughs.

---

## How to use this file

- Each item has a unique ID (e.g. `BUG-1`, `LAUNCH-1`)
- Check off `- [ ]` → `- [x]` as you complete items
- Items grouped by category, then ordered by priority within each category
- Each item explains the what / why / fix, beginner-friendly

---

## ✅ Progress Tracker

### 🚨 LAUNCH-BLOCKING

- [ ] **LAUNCH-1** — Privacy policy file still not actually hosted at the wired URL
- [ ] **LAUNCH-2** — EAS production build pending — required for the iOS permission descriptions added in v2 to take effect on real devices

### 🐛 BUGS (real or likely)

- [x] **BUG-1** — RESOLVED (verified 2026-06-02). `MultiplayerGameScreen.js` now uses the new layout (`styles.section` + `styles.label` + `styles.hand` + `handWidth`); the old boxed-section styles (`sectionActive`/`sectionHeader`/`sectionName`/`sectionValue`/`handRow`/`actionRow`) are gone. Code parity confirmed; a device glance is still worthwhile but the v3 claim is no longer true.
- [x] **BUG-2** — Audited all 9 game screens for hooks-after-early-return (2026-06-01). Only `WildRoundGameScreen` was affected; fixed in commit `9bd069a`. All other screens place every hook above every early return.
- [x] **BUG-3** — RESOLVED (verified 2026-06-02). `stopBroadcasting()` now runs in the lobby's unmount cleanup (`return () => stopBroadcasting()`), the Start-Game path, and the quit/back path. The broadcast no longer survives leaving the lobby.
- [x] **BUG-4** — Auto-save throttle added to Rummy, GoFish, Poker, LastCard (same lastSaveRef 3s gate as Conquián). Commit `5748463`.
- [ ] **BUG-5** — `WildRoundGameScreen` has no save/resume (documented as a known gap in PROJECT_NOTES.md, but still ships)
- [x] **BUG-6** — ✅ FIXED (commit `734dae9`, was **high**) — added a per-connection receive buffer to both TCP handlers in `GameNetwork.js` so messages larger than one segment reassemble instead of being silently dropped. Verify on two devices in a Poker/Conquián game.

### ⚡ PERFORMANCE

- [ ] **PERF-1** — `cardTheme.js` still loads 7 themes × 53 images at startup
- [ ] **PERF-2** — LastCard ships 109 images in a single inline module
- [ ] **PERF-3** — `MultiplayerGameScreen` broadcasts the full state on every Hit/Stand even when nothing visible changed (e.g. dealer index increment)

### ♿ ACCESSIBILITY

- [x] **ACC-1** — Wild Round pagination dots + Spider fly-away ghosts now hidden from screen readers (decorative; the "X / Y" counter already announces position). Commit `79bc656`.
- [ ] **ACC-2** — Deal animation may interfere with screen reader focus (Rummy/Conquián 10-card deal). ⚠️ NOTE (2026-06-02): the v3 recipe `accessibilityElementsHidden={!hasMountedRef.current}` keys off a **ref**, which doesn't trigger a re-render — the hand would stay hidden after the deal. Needs a state flag instead. Deferred.

### 🎨 UX POLISH

- [x] **UX-1** — CardThemeScreen accent swapped to `#7fb3ff` blue (dot + "Use This Theme" button); button uses dark text for contrast, dimmed state recolored. Commit `aeeca46`.
- [x] **UX-2** — Blackjack result-modal delay now conditional: 2s only when the dealer actually plays, 600ms on an instant bust / natural blackjack. Commit `fd37a71`.
- [ ] **UX-3** — Deal animation runs every time the player navigates back to a single-player game screen (e.g. closing How To Play modal can cause re-mount)
- [ ] **UX-4** — No visual "loading" or "dealing" state during the 50ms `hasMountedRef` delay — usually invisible, occasionally noticeable

### 🧹 CODE QUALITY (carried forward from v2)

- [ ] **CQ-1** — Extract `useMultiplayerGame` hook (was M-1)
- [ ] **CQ-2** — Centralize game registry (was M-2)
- [ ] **CQ-3** — Centralize magic numbers into config.js (was M-8)
- [ ] **CQ-4** — Move multiplayer Blackjack logic to `game/blackjack.js` (was M-9)
- [ ] **CQ-5** — Extract LastCard image map to its own file (was M-4)
- [ ] **CQ-6** — Split `cardTheme.js` into per-theme files (was M-5)
- [ ] **CQ-7** — `LobbyScreen` handler closure stale-state risk (was M-7)
- [ ] **CQ-8** — Standardize `String(id)` vs raw id comparisons (was L-8)
- [ ] **CQ-9** — Standardize SafeAreaView / KeyboardAvoidingView usage (was L-12)
- [ ] **CQ-10** — Verify `lastCard.js` action functions are pure (was L-11)
- [ ] **CQ-11** — Resolve Conquián's half-state in RummyVariantPicker (was L-4)
- [ ] **CQ-12** — Network message shape inconsistencies (was HI-5)
- [x] **CQ-13** — Removed the unused `typescript` dependency. Commit `3eb638a`.
- [x] **CQ-14** — ✅ RESOLVED (commit `ba929a5`). Game saves now carry a `SAVE_VERSION` wrapper; a shared validator (used by `loadGame` *and* `hasSave`) discards saves that are missing/corrupt/incompatible-version and wipes them, so an outdated shape starts fresh instead of crashing the screen, and the resume prompt stays consistent. Legacy unwrapped saves treated as v1. Tested.

### 🚀 IMPROVEMENTS (post-launch)

- [ ] **IMP-1** — `__DEV__` debug overlay
- [~] **IMP-2** — Jest tests for game logic — pure-logic layer DONE 2026-06-01/02. Lean app-decoupled Jest setup (`npm test`); 150 tests covering all 7 pure logic modules: deck/blackjack, poker, conquian, rummy, lastCard, solitaire, wildround. Not yet covered: reducers, AI move selection, and GameNetwork (kept open for future expansion).
- [ ] **IMP-3** — Remote-loadable wildround cards (OTA content updates)
- [ ] **IMP-4** — Centralized round-over helper
- [ ] **IMP-5** — "Quick Match" button on Home
- [ ] **IMP-6** — Dev-mode tools screen
- [ ] **IMP-7** — Schema versioning for saves
- [ ] **IMP-8** — Card move animation (the spec's recipe #3, still not implemented)
- [ ] **IMP-9** — Solitaire face-down reveal flip (spec mentioned but not built)

---

# 🔎 v4 Review pass (2026-06-04)

Scope: focused static review of the highest-risk code — the network layer
(`GameNetwork.js`) and the pure game-logic modules (`gofish`, `lastCard`,
`conquian`, plus spot-checks of the others), leaning on this session's extensive
reading of the screens. **Not** an exhaustive line-by-line of all ~28k lines —
the large game-screen files (`RummyGameScreen`, `PokerGameScreen`,
`ConquianGameScreen`, `WildRoundGameScreen`, `LastCardGameScreen`, ~7k lines)
warrant a dedicated follow-up pass. The codebase is mature (v3-reviewed), so few
new bugs surfaced. Findings grouped as requested:

### Group 1 — fixable without approval (DONE this pass)

- [x] **NB-1** — `GameNetwork` `broadcastToClients`/`sendToClient`/`sendToHost`
  called `socket.write()` unguarded. A socket mid-close (a client that just
  disconnected) can throw; in `broadcastToClients` the `forEach` would abort, so
  the *remaining* clients silently miss that message → desync. Fixed with a
  `safeWrite()` try/catch wrapper.
- [x] **NB-2** — `pickGoFishAIMove` would throw on an empty hand
  (`hand[…].rank` / `Object.entries(counts)[0][0]`). The screen already guards
  `hand.length === 0`, so it's defensive only — added an early `return null`.

### Group 2 — need your verification (ideally on device / two devices)

- [ ] **CQ-8** (carry-forward) — numeric `clientId` (from `nextClientId++`) vs
  string `player.id`. The pure logic wraps everything in `String(...)` so it's
  mostly safe, but raw comparisons in the multiplayer screens should be audited;
  verify turn-taking with mixed id types across two devices.
- [x] **NB-4** — Follow-up pass over the big game-screen files
  (Rummy/Poker/Conquián/Wild Round/Last Card) **complete**: structurally sound —
  hooks are all above the render guards (Wild Round even carries an enforcing
  comment), every screen is null-safe on first render (explicit `if (!gameState)`
  guards, or optional chaining in Last Card), and network listeners/effects have
  cleanup. No new bugs found; the deeper risks remaining are the multiplayer
  runtime behaviors (CQ-8 / PERF-3) that need two devices.
- [ ] **PERF-3** (carry-forward) — multiplayer broadcasts the full state on every
  action; verify responsiveness with two devices before optimizing.
- [ ] **NB-3** — the server/client `data` handlers call `listeners.onMessage()`
  *inside* the parse `try/catch`, so an exception thrown by a message handler is
  silently swallowed (can hide real bugs). Low priority; verify no handler relies
  on this, then consider moving the call outside the try.
- [ ] **UX-4** (carry-forward) — optional brief "dealing…" state during the mount
  delay. Confirm it's wanted.

### Group 3 — need a new EAS build

- [ ] Everything in `EAS_REBUILD_PENDING.md` (immersive bars, free rotation +
  Solitaire landscape locks via `expo-screen-orientation`, network-permission
  verify) and the **smaller APK** (the JEWEL/App-Icon asset deletions land on the
  next build). Plus **LAUNCH-2** (production build).

---

# 🚨 LAUNCH-BLOCKING

These two items are the only things between you and a working App Store / Google Play submission.

---

## LAUNCH-1. Privacy policy file still not actually hosted

**Effort:** 15 minutes
**Risk if ignored:** **App Store will reject the submission** — they tap the privacy policy URL and get a 404.

### What's happening

Back in DEEP_REVIEW v2 we set the URL `https://hardrockpdc.github.io/card-game-app/privacy.html` in `screens/AboutScreen.js` and `APP_STORE_REVIEW_NOTES.md`. The URL is wired in code, but **the file at that URL doesn't actually exist yet.** This is the missing post-code step we deferred.

When the App Store reviewer taps "Privacy Policy" in your app, the browser opens that URL and gets a "Page Not Found." That's an automatic rejection.

### Why this is the highest-priority remaining item

Of everything in this doc, this is the only item that will definitely cause a rejection. Everything else is internal quality. Solve this before submitting.

### The fix (manual, outside Claude Code)

Three options ranked by simplicity:

**Option A — GitHub Pages (recommended — free, easy):**

1. In your project repo, create a new file at the root: `docs/privacy.html`
2. Paste a basic privacy policy. Below is a complete template you can drop in as-is — no-tracking apps don't need much.
3. Enable GitHub Pages: Repo → Settings → Pages → Source: `main` branch, `/docs` folder → Save
4. Wait ~1 minute for Pages to deploy
5. Visit `https://hardrockpdc.github.io/card-game-app/privacy.html` in a browser to confirm it loads

**Privacy policy template:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Card Night — Privacy Policy</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #222; }
    h1 { color: #1a1a2e; }
    h2 { color: #2c3e50; margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>Card Night — Privacy Policy</h1>
  <p><strong>Last updated:</strong> May 17, 2026</p>

  <h2>What we collect</h2>
  <p>Card Night does not collect, store, or transmit any personal data to any server.</p>

  <h2>What's stored on your device</h2>
  <p>All gameplay data — your profile name, photo, coin balance, game statistics, and saved games — is stored only on your device using your device's local storage. None of this data leaves your device.</p>

  <h2>Camera and photo library</h2>
  <p>If you choose to set a profile photo, Card Night uses your camera or photo library only at the moment you tap that option. The photo is stored only on your device.</p>

  <h2>Local network</h2>
  <p>Card Night uses your local Wi-Fi network only for direct device-to-device multiplayer. No third-party servers are involved. No data is logged or shared.</p>

  <h2>Third parties</h2>
  <p>Card Night contains no third-party analytics, advertising networks, or tracking SDKs.</p>

  <h2>Children</h2>
  <p>Card Night does not collect data from any user, including children under 13.</p>

  <h2>Changes to this policy</h2>
  <p>If this policy changes, the updated version will be posted at this URL.</p>

  <h2>Contact</h2>
  <p>Questions? Open an issue at <a href="https://github.com/hardrockpdc/card-game-app/issues">github.com/hardrockpdc/card-game-app/issues</a>.</p>
</body>
</html>
```

> The wording matches what Apple/Google look for: who you are, what you collect, where it's stored, who it's shared with (nobody), and how to contact you. Vague policies get rejected; this one is specific.

**Options B and C** (Netlify Drop / a static hosting service) work too — anywhere the URL doesn't change is fine.

---

## LAUNCH-2. EAS production build pending

**Effort:** 30-90 minutes (depending on whether you've used EAS before)
**Risk if ignored:** The iOS permission descriptions from v2 (NSCameraUsageDescription, NSPhotoLibraryUsageDescription) live in `app.json`, but they don't take effect on real devices until you produce a fresh native build. Without a new build, an iOS user who tries to take a profile photo will hit the **old** binary without the description and crash.

### What's happening

`app.json` config changes (especially `infoPlist` keys) get compiled into the iOS binary at build time. Your current TestFlight / development build was made before we added the camera permission descriptions, so it's missing them in its `Info.plist`.

Per PROJECT_NOTES.md, this is already on your "Still to do before EAS production build" list. It's the actual final step before submission.

### Why this matters

- iOS will crash hard on any code path that triggers `NSCameraUsage` without a description
- The build is what gets submitted to the App Store, not the JavaScript bundle alone
- Until you re-build, the JS changes since the last build are running on an older native layer

### The fix (separate workflow)

This is its own multi-step process outside Claude Code:

1. Install EAS CLI if you haven't: `npm install -g eas-cli`
2. `eas login` (with your Expo account)
3. `eas build:configure` (first time only — creates `eas.json`)
4. `eas build --profile production --platform all`
5. Wait 10-20 min for the cloud build
6. Download the resulting .ipa (iOS) and .aab (Android) files
7. Upload to App Store Connect / Google Play Console

I can walk through any individual step if you want — just ask.

---

# 🐛 BUGS

Real or likely problems in the code. Listed in order of risk.

---

## BUG-1. MultiplayerGameScreen.js still has the OLD layout (Session A code didn't actually land)

**Effort:** 30 minutes (re-run Session A)
**Risk if ignored:** Multiplayer Blackjack screen looks broken / inconsistent with single-player. Doesn't crash, but the visual parity we did in v2's "Session A" is missing.

### What's happening

When we did the "make multiplayer Blackjack look like single-player" work, the project knowledge later showed both Session A code AND Session B (animations) code as committed. Today's resync shows something different: **the styles in `MultiplayerGameScreen.js` are still the OLD ones** — `styles.section`, `styles.sectionActive`, `styles.sectionHeader`, `styles.handRow`, `styles.activeHandBorder`, `styles.actionRow`, etc. These are the styles Session A was supposed to remove.

Specifically, the render still has:

```javascript
<View style={[styles.section, isCurrent && styles.sectionActive]}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionName}>...</Text>
    <Text style={styles.sectionValue}>...</Text>
    ...
```

This is the pre-Session-A code. Session A was supposed to replace this with:

```javascript
<View style={styles.section}>
  <Text style={styles.label}>...</Text>
  <View style={[styles.hand, { width: handWidth }]}>
```

Two reasonable explanations:

1. The Session A commit happened on a different branch and didn't reach main
2. The styling refactor was reverted by a later commit
3. Project knowledge was stale at the time and we never actually confirmed the visual

I see `useWindowDimensions` and `handWidth` ARE present (those were from Session A), so SOME of Session A landed. But the JSX restructure didn't.

### Why this matters

Multiplayer Blackjack visually looks worse than single-player, and you specifically asked for parity. The animations (Session B) DID land — there are `hasMountedRef`, `computePlayerDealDelay`, `computeDealerDealDelay`, and `animateDeal` props on Card. So animations work, but on the old "boxed sections" layout.

### The fix

Re-run the Session A prompt. The prompt is in our chat history (the one titled "refactor: multiplayer Blackjack visual + UX parity with single-player (Session A)"). The Card render structure to add `animateDeal` / `dealDelay` props to is now slightly different from what that prompt expected, since Session B landed first. We'll need a careful Session A re-run that preserves the Session B animation wiring.

Lower-risk path: a single combined prompt that does the Session A JSX refactor AND preserves the existing `hasMountedRef` / `dealDelay` props on the new Card elements.

---

## BUG-2. UX-5 BackHandler useEffects placed AFTER early returns in some game screens

> **✅ RESOLVED 2026-06-01.** Full hooks-order audit run across all 9 game screens
> (KICKOFF Task 0.5). Result: only `WildRoundGameScreen` had a misplaced hook — its
> UX-5 BackHandler `useEffect` sat *after* the `if (!gameState)` loading guard, which
> crashes on entry because `gameState` starts null and is filled in async. Moved the
> effect above the guard (commit `9bd069a`). Every other game screen — Conquián, Rummy,
> Go Fish, Poker, Multiplayer Blackjack, single-player Blackjack — places all hooks above
> all early returns. Solitaire and Last Card have no null-state early return at all, so
> they're structurally immune. The remaining detail below is kept for historical context.

**Effort:** 30 minutes total (audit + fixes)
**Risk if ignored:** Same crash pattern that hit Poker recently — "Rendered more hooks than during the previous render"

### What's happening

When we did the UX-5 BackHandler sweep in DEEP_REVIEW v2 (Polish Bundle), the useEffect was added to many game screens. Several of those screens have a `loading` / `gameState === null` early return. Looking at the actual code now:

- **PokerGameScreen.js** — fixed last week, comment "must be before early returns" confirms it ✅
- **RummyGameScreen.js** — `hasMountedRef` useEffect placed after the network listener block. **Need to verify the UX-5 BackHandler useEffect placement.**
- **ConquianGameScreen.js** — `hasMountedRef` is before any early return ✅. Need to verify UX-5.
- **GoFishGameScreen.js** — similar pattern, need to verify UX-5.
- **LastCardGameScreen.js** — its main useEffect (`init`) does early-return `if (!isHost) return`. Need to verify UX-5 placement.
- **WildRoundGameScreen.js** — need to verify UX-5.
- **GameScreen.js** (single-player Blackjack) — the UX-5 useEffect is placed before the early `if (screenPhase === "betting") return ...`. **Actually wait** — looking again, GameScreen's only early return is `if (screenPhase === "betting") return (...)` which is the rendering fork at the bottom of the component, AFTER all useEffects. So GameScreen is safe.
- **MultiplayerGameScreen.js** — same as Conquián, UX-5 is before the loading early return ✅
- **SolitaireGameScreen.js** — UX-5 placement needs verification.
- **LobbyScreen.js** — no early returns for null state, so safe.

### Why this matters

Any screen where the UX-5 useEffect lives after an `if (something) return ...` is a future crash waiting to happen — the same way Poker crashed. The Poker crash already happened to you; the others are dormant.

### The fix

Audit each of the 9 game screens. For each one:

1. Find every `useEffect` in the component
2. Find every `if (...) return ...` early-return statement
3. Confirm EVERY useEffect appears BEFORE EVERY early return

If any useEffect is misplaced, move it up. Same fix we did for Poker.

> Note: This is a pure correctness audit. No new features, no styling changes. The goal is "all hooks before all returns, always." Once done, you've eliminated this whole class of bug across the app.

---

## BUG-3. LobbyScreen broadcast keeps running when navigating to a game

**Effort:** 5 minutes
**Risk if ignored:** Same family of issue as v2's BUG-5 (UDP broadcast keeps running after game starts), but for the case where the lobby is left via a non-tap path

### What's happening

`LobbyScreen.js` has a host-side useEffect that returns `() => stopBroadcasting()` as cleanup. That cleanup fires when the lobby unmounts. **BUT** the start-game flow uses `navigation.replace(game.screen, ...)` — React Navigation may keep the previous screen mounted in some cases (especially with stack screens that have `freezeOnBlur` set or animations in progress).

We previously addressed the explicit "Start Game" path by calling `stopBroadcasting()` directly in `handleStartGame`. So that path is now belt-and-suspenders covered. But there are still other ways out of the lobby (Android back, navigation.goBack, etc.) where the cleanup might or might not fire reliably.

This is mostly belt-and-suspenders — the fix is to call `stopBroadcasting()` defensively in the `handleQuit` and BackHandler paths as well, not just in `handleStartGame`.

### Why this matters

If broadcast keeps running after the lobby is gone, other phones nearby see a "Pedro's game" entry that doesn't accept new joins. Minor but confusing for users.

### The fix

In `LobbyScreen.js`, look for the `handleQuit` / leave-lobby paths and the UX-5 BackHandler's "Leave" onPress. In each, add `stopBroadcasting()` before navigation. If `stopBroadcasting` is idempotent (which it is — internal `broadcastSocket` becomes null after first call), calling it multiple times is fine.

---

## BUG-4. Auto-save throttle missing in multiple game screens (Conquián already fixed)

**Effort:** 5 minutes
**Risk if ignored:** Battery and performance impact on long games — every meld, every pass, every selection writes to AsyncStorage

### What's happening

**Conquián is already fixed** — `ConquianGameScreen.js` has a `lastSaveRef` 3-second throttle in place (confirmed via code inspection, lines 255-265).

The un-throttled pattern still exists in:
- `RummyGameScreen.js` (auto-save fires on every `gameState` change)
- `GoFishGameScreen.js` (auto-save fires on every `gameState` change)
- `PokerGameScreen.js` (auto-save fires on `[gameState, tournamentWinner]`)
- `LastCardGameScreen.js` (auto-save fires on every `gameState` change)

### Why this matters

Solitaire's PERF-3 fix made it noticeably snappier on Android. The same throttle pattern would benefit the other games. Conquián is the worst offender because of how often the state mutates during meld preview.

### The fix

Apply the same `lastSaveRef` throttle to each game's auto-save effect:

```javascript
const lastSaveRef = useRef(0);

useEffect(() => {
  if (!isSinglePlayer || !fullRef.current) return;
  if (gameState?.phase === "results") {
    clearGame(SAVE_KEY_CONQUIAN);
    return;
  }
  const now = Date.now();
  if (now - lastSaveRef.current < 3000) return;
  lastSaveRef.current = now;
  saveGame(SAVE_KEY_CONQUIAN, { fullState: fullRef.current });
}, [gameState]);
```

Apply to all 5 games. ~5 min per file, all the same pattern.

> Edge case: when a user explicitly hits "Save & Exit", we want a guaranteed save (not throttled). For now this is fine since "Save & Exit" goes through `handleSaveAndExit` which already calls `saveGame` directly, bypassing the throttle's useEffect.

---

## BUG-5. WildRound has no save/resume — only single-player game without it

**Effort:** 1 hour
**Risk if ignored:** Inconsistent UX. Users who pause WildRound mid-game (phone call, etc.) lose their progress.

### What's happening

Per PROJECT_NOTES.md: "WildRound save/resume — add auto-save + resume prompt + Save & Exit (currently the only single-player game without this feature)."

Every other single-player game (Blackjack, Solitaire, Rummy, Conquián, Go Fish, Poker, Last Card) has save/resume. WildRound is the odd one out.

### Why this matters

It's a feature gap that users will notice. Not technically a bug, but listed in PROJECT_NOTES as something to fix before launch.

### The fix

Add the standard save/resume pattern to WildRound:
1. `SAVE_KEY_WILDROUND` constant
2. Auto-save useEffect (throttled with `lastSaveRef` 3s gate — see BUG-4 for the pattern)
3. Resume check on mount
4. Save & Exit menu item
5. Wire resume prompt in `WildRoundVariantPickerScreen` (or wherever WildRound is launched from)

> Heads-up: WildRound has unique state — the `wildroundCards.json` content, the carousel position, the judge selection. Saving it properly requires understanding what fields are essential. May warrant a brief design conversation before implementing.

---

## BUG-6. TCP messages aren't reassembled — large messages get silently dropped (multiplayer desync)

> **✅ FIXED 2026-06-02 (commit `734dae9`).** Both TCP receive handlers now buffer the incoming byte stream and parse only complete newline-terminated lines, carrying any partial remainder forward. Detail retained below for context. Still wants a two-device verification in a Poker/Conquián game.

**Found:** Deep-dive review, 2026-06-02
**Effort:** ~45 min (buffer + tests)
**Severity:** High — intermittent multiplayer desync / dropped actions, worse as game state grows
**Risk if ignored:** Clients miss state updates in Poker/Conquián/Last Card multiplayer; the board freezes or diverges with no error shown

### What's happening

`game/GameNetwork.js` reads incoming TCP data like this (both the server's per-client handler and the client handler):

```javascript
socket.on("data", (data) => {
  data
    .toString()
    .split("\n")
    .forEach((line) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line);
        ...
      } catch (_) {}   // <-- a fragmented message lands here and is dropped
    });
});
```

TCP is a **byte stream, not a message stream**. The OS can deliver a single `data` event that contains:

- a partial message (a JSON object split across two packets), or
- the tail of one message plus the head of the next.

The newline framing is correct in spirit, but there's **no buffer to hold a partial line between `data` events**. When a message is larger than one TCP segment (~1460 bytes on a typical LAN MTU), it arrives in pieces. The trailing partial line fails `JSON.parse`, hits the empty `catch`, and is **silently discarded**.

### Why this matters / when it bites

- Small messages (JOIN, single ACTION, ASSIGNED_ID) usually fit in one segment, so 2-player Blackjack often looks fine — which is why this hasn't been obvious.
- **Full-state broadcasts are large.** A Poker or Conquián `GAME_STATE` carries the deck plus every player's hand — easily over 1460 bytes. Those are exactly the messages that fragment and get dropped, so the more complex the game, the more likely a desync.
- This **compounds with PERF-3** (the host broadcasts the entire state on every action): big, frequent messages are the worst case for the missing reassembly.

### The fix

Buffer per connection and only parse complete newline-terminated lines, keeping the remainder for the next event. Standard line-framing:

```javascript
// server: one buffer per client socket (declare inside createServer callback)
// client: one module-level buffer for clientSocket
let buffer = "";
socket.on("data", (data) => {
  buffer += data.toString();
  let idx;
  while ((idx = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      /* ...existing handling... */
    } catch (_) {}
  }
});
```

The senders already append `"\n"` to every message (`broadcastToClients`, `sendToClient`, `sendToHost`, the `ASSIGNED_ID` write), so the framing contract is intact — only the **receiver** needs the buffer. UDP discovery is unaffected (datagrams are message-bounded).

### Follow-up checks

- This is networking code, so it can't be unit-tested the way the pure logic is, but it's verifiable on two devices: start a Poker or Conquián multiplayer game and confirm the client board stays in sync across several actions (previously prone to freezing/diverging).
- Consider a tiny guard against an unbounded buffer (e.g. cap at a few hundred KB) — low priority on a trusted LAN.

---

# ⚡ PERFORMANCE

---

## PERF-1. cardTheme.js loads 7 themes × 53 images at startup

**Effort:** 30-60 minutes (combined with CQ-6)
**Risk if ignored:** Slower cold-start launch on low-end Android, ~50MB+ peak memory baseline

(Carried over unchanged from v2 — this is genuine work that's still pending. The fix recipe is in v2; same approach applies.)

---

## PERF-2. LastCard ships 109 images in a single inline module

**Effort:** 15 minutes (combined with CQ-5)
**Risk if ignored:** Slow LastCard mount, ~7MB images held in memory while LastCard is open

(Carried over unchanged from v2.)

---

## PERF-3. MultiplayerGameScreen broadcasts the full state on every minor change

**Effort:** 20 minutes
**Risk if ignored:** Unnecessary network traffic in multiplayer; could matter on slow Wi-Fi

### What's happening

Look at `MultiplayerGameScreen.js`'s `applyState`:

```javascript
function applyState(newState) {
  stateRef.current = newState;
  setGameState(newState);
  if (isHost) {
    broadcastToClients({ type: "GAME_STATE", ...toBroadcast(newState) });
  }
}
```

Every time the host's state changes, the *full* state is serialized to JSON and broadcast to every client. That includes:
- The full deck (52 cards × all their objects)
- Every player's hand (could be 4 players × 5 cards = 20 cards)
- Dealer state
- All metadata

For a Hit action, only ONE card moved from deck to hand. We send the whole state anyway because the protocol is "state replacement, not diff."

This is the same pattern noted in v2's CQ-12 (Network message shape inconsistencies) and the original GameNetwork.js comment about "last-write-wins."

### Why this matters

For 2-player Blackjack on home Wi-Fi, this is invisible. For 4-player Blackjack over a hotel Wi-Fi network with shared bandwidth, the full-state broadcast on every action can add real latency.

### The fix (deferred)

A proper diff protocol is a bigger project (CQ-12 territory). For v1, accept the cost. Mark this item as deferred and revisit when you have multiplayer-over-internet on the roadmap.

---

# ♿ ACCESSIBILITY

---

## ACC-1. Wild Round carousel dots + Spider fly-away ghost cards have no a11y labels

**Effort:** 10 minutes
**Risk if ignored:** Minor — screen-reader users hear silence in those regions

### What's happening

Two areas missed in the v2 accessibility sweep:

1. **Wild Round carousel dots** — they're pagination indicators (the spec explicitly says "carousel pagination, not turn indicators") so they don't need a state label, but they could benefit from `accessibilityRole="adjustable"` so screen readers announce them as carousel position.

2. **Spider fly-away ghost cards** — these are decorative-only animated overlays. They should be `accessible={false}` to prevent screen readers from focusing on cards that are flying off the screen.

### Why this matters

Not a real barrier — both are minor polish items. Mentioned here for completeness.

### The fix

In `WildRoundGameScreen.js`, find the carousel dots render and add `accessibilityRole="adjustable"` plus an `accessibilityLabel` like `"Card ${index + 1} of ${cards.length}"`.

In `SolitaireGameScreen.js`, find the fly-away ghost cards render (the `spiderFlyAwayCards.map(...)`) and add `accessibilityElementsHidden={true}` and `importantForAccessibility="no-hide-descendants"` to the wrapper.

---

## ACC-2. Deal animation may interfere with screen reader focus on rapidly-mounting cards

**Effort:** 15 minutes
**Risk if ignored:** Screen-reader users may have their focus jump around or get lost when cards animate in (especially Rummy's 10-card deal)

### What's happening

When Rummy's initial deal happens, all 10 cards mount at staggered times (0ms, 100ms, ... 900ms). Each card has an `accessibilityLabel` from ACC-2 (DEEP_REVIEW v2). VoiceOver / TalkBack might:
- Lose focus as cards appear
- Announce cards as they slide in, creating audio overlap
- Get stuck on a card that's in mid-animation

### Why this matters

For a sighted user the animation is nice. For a blind user, "Five of clubs. Three of diamonds. Jack of hearts. Eight of spades..." rapid-fire could be confusing.

### The fix

Add `accessibilityElementsHidden={!hasMountedRef.current}` to the hand container. This tells screen readers "ignore this region during the initial deal animation; reveal it once the animation completes." After the 50ms `hasMountedRef` timer fires, the region becomes accessible normally.

This is a minor tradeoff — screen reader users have a tiny delay before they can navigate the hand, but the hand is then stable and announceable in any order. Much better UX than a moving target.

---

# 🎨 UX POLISH

---

## UX-1. CardThemeScreen still uses red accent

**Effort:** 5 minutes
**Risk if ignored:** Visual inconsistency with the rest of the app post-UX-3 sweep

### What's happening

DEEP_REVIEW v2's UX-3 standardized `#e94560` red spinners to `#7fb3ff` blue across the app. `CardThemeScreen.js` was missed — its theme-selection accent (the active dot, the Apply button, the confirmed-state colors) are all still red.

### Why this matters

When you open Profile → Card Theme, the screen visually clashes with the rest of the polished UX. Tiny issue but jarring.

### The fix

Find every `#e94560` in `CardThemeScreen.js` (excluding the actual card theme color swatches — those are theme content) and replace with `#7fb3ff`. Or just verify each one — if it's a structural UI element, swap it; if it's content (e.g. a theme preview), leave alone.

---

## UX-2. Result modal delay fires even when there's no dealer reveal to wait for

**Effort:** 10 minutes
**Risk if ignored:** Slight feels-laggy moment on hands that don't reveal the dealer (player bust before stand)

### What's happening

In `GameScreen.js` we added a 2000ms delay before showing the result modal so the dealer flip animation has time to play. That delay was perfect for the "you stand → dealer reveals" path.

But it ALSO fires for paths where there's no flip:
- Player busts on their hit → result is immediate, but modal still waits 2s
- Player gets natural blackjack → modal still waits 2s
- Adjust Bet returns to betting phase → already handled by the cancel

### Why this matters

A bust feels like the modal is slow. The animation reason isn't visible to the user — they just see a delay.

### The fix

Make the delay conditional. If `showFullDealerHand` is false at the moment of `resolveHandPayout` (meaning we're not going to do the dealer reveal — player bust, natural blackjack, etc.), use a shorter delay (~400ms) or no delay. Only delay 2s when we're showing the dealer reveal sequence.

Pseudocode:

```javascript
const needsFlipDelay = (
  result !== "blackjack" &&
  gameStatus === "finished" &&
  showFullDealerHand
);
const delayMs = needsFlipDelay ? 2000 : 400;

modalDelayTimerRef.current = setTimeout(() => {
  setScreenPhase("result");
}, delayMs);
```

The 400ms small delay still feels deliberate (not a "snap to modal") but doesn't drag.

---

## UX-3. Deal animation re-plays after closing How To Play (or any nav)

**Effort:** 15 minutes
**Risk if ignored:** Slightly weird visual — you close the tutorial overlay, and your cards re-animate in from above

### What's happening

When you navigate from a game screen to How To Play and back (or any other modal-style navigation), the game screen may unmount and re-mount depending on stack config. When it remounts, `hasMountedRef.current` resets to false, the 50ms timer runs again, and cards animate in.

### Why this matters

Subtle — but it makes the animation feel un-intentional. The cards weren't "just dealt," they were already there.

### The fix

Two approaches:

**A. Check the saved-state path** — when the screen mounts via a restore (loadGame returned data), set `hasMountedRef.current = true` synchronously before the first render. This way restored games never animate.

**B. Detach the screen from the stack** — set `freezeOnBlur` or `unmountOnBlur: false` on the navigation stack config for game screens, so they don't fully unmount when you navigate to HowToPlay or modal screens.

A is cleaner; B has broader implications (memory usage, etc.). Recommend A.

---

## UX-4. No visual "dealing" state during the 50ms hasMountedRef delay

**Effort:** Skip (intentional, minor)

### What's happening

For the 50ms before `hasMountedRef.current = true`, cards are at their final position with no animation. If the user hits "Deal" and renders happen on a slow phone, there's a brief window where cards just appear with no transition.

### Why this matters

Almost never visible. Listed for completeness.

### The fix

Probably none needed. If you want to be precise, set initial opacity to 0 and only show cards once `hasMountedRef.current` is true. But it's a tradeoff — adds complexity for a 50ms invisible flash that almost nobody will see.

---

# 🧹 CODE QUALITY

These are all carried over from DEEP_REVIEW v2 — none have been completed. Plus two new ones from this sweep.

---

## CQ-1 through CQ-12

(All carried forward from v2 unchanged. See v2 doc for full beginner walkthroughs.)

---

## CQ-13. TypeScript dependency installed but unused

**Effort:** 2 minutes
**Risk if ignored:** None — pure cleanup

### What's happening

`package.json` lists `typescript` as a dependency, but the project is 100% JavaScript (no `.ts` or `.tsx` files, no `tsconfig.json`). Some tooling (Expo's default config) installed it by default.

This caused a small confusion in our last animation session — Claude Code ran `tsc` and got many "errors" that weren't real (just TypeScript complaining about a non-TypeScript project).

### Why this matters

Cosmetic only. Lower install size, cleaner `package.json`, no future confusion.

### The fix

```bash
npm uninstall typescript
```

That's it. Verify the app still builds and runs. (It will — nothing depends on `tsc` for production.)

---

## CQ-14. Save effects use raw JSON.parse without schema validation

**Effort:** 1-2 hours (post-launch)
**Risk if ignored:** Older saves silently break when the schema changes; user sees "couldn't load save" or game starts fresh

### What's happening

`game/gameSaves.js`:

```javascript
export async function loadGame(gameKey) {
  try {
    const raw = await AsyncStorage.getItem(gameKey);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (err) {
    warn("[gameSaves] load failed — wiping corrupted save:", err);
    await AsyncStorage.removeItem(gameKey).catch(() => {});
    return null;
  }
}
```

This is fine when the save schema is stable. But if you add a new field to one of the game states in a future update (say, `gameState.metadata`), and a user loads a v1 save, the parsed object will be missing that field. Code that assumes `gameState.metadata` exists will crash or behave incorrectly.

### Why this matters

This is the same problem as IMP-7 (Schema versioning for saves). They're related:
- CQ-14 is the *detection* — notice when a save is from an older schema
- IMP-7 is the *handling* — version saves with `{ schemaVersion: 1, ... }`

For v1.0 with no migrations, you don't need either. For v1.1 onward, both become important.

### The fix (deferred to v1.1)

Combine with IMP-7. When you do a release that changes any save schema, bump `schemaVersion` and add a migration path. Loads should check the version and either migrate or wipe with a friendly message.

---

# 🚀 IMPROVEMENTS (post-launch)

(All carried forward from v2 unchanged.)

---

## IMP-8. Card move animation (the spec's recipe #3)

**Effort:** 4-6 hours
**Was:** Deferred from animations session

### What's happening

The Animations.md spec has "recipe #3" — card move animation (drag from hand to table, fly from deck to slot, etc.). This is the genuinely hard one. We deliberately skipped it to keep momentum.

### When to tackle

After v1 ships and you have user feedback. If players ask for it, do it. If they don't notice, skip until you do another polish pass.

---

## IMP-9. Solitaire face-down reveal flip

**Effort:** 1-2 hours
**Was:** Deferred from animations Level 2

### What's happening

Solitaire (Klondike) has many face-down tableau cards. When a card is uncovered, it should flip face-up (same 3D flip as Blackjack dealer reveal). We deferred this because Solitaire renders through `CardSlot`, not directly through `Card`.

### When to tackle

After IMP-8 or as a focused 1-hour session. Pattern is: pass `animateReveal` through `CardSlot` to `Card`. The flip already works; just needs prop plumbing.

---

# 🎯 Recommended order

If you want a suggested path:

### Pre-launch (must do before submitting)
1. **LAUNCH-1** — host the privacy policy file (~15 min)
2. **LAUNCH-2** — EAS production build (~90 min including walkthrough)
- ✅ ~~BUG-6~~ (TCP reassembly buffer, `734dae9`), ✅ ~~BUG-1~~ (Session A parity verified in code), ✅ ~~BUG-2~~ (hooks audit, `9bd069a`)

### Polish
- ✅ ~~BUG-4~~ (`5748463`), ✅ ~~BUG-3~~ (lobby `stopBroadcasting`), ✅ ~~CQ-13~~ (`3eb638a`), ✅ ~~UX-1~~ (`aeeca46`), ✅ ~~UX-2~~ (`fd37a71`), ✅ ~~ACC-1~~ (`79bc656`)
3. **ACC-2** — screen-reader focus during the deal — needs a state flag (not a ref); see the tracker note

### Post-launch (v1.1)
10. **BUG-5** — WildRound save/resume (~1 hr)
11. **UX-3** — deal animation re-play (~15 min)
12. **PERF-1, PERF-2, CQ-5, CQ-6** — image/theme loading
13. **CQ-13** — uninstall TypeScript (~2 min)
14. **IMP-8, IMP-9** — animation polish

### Eventually
- Everything else as time allows
- IMP-2 (Jest tests) — long-term investment
- IMP-7 + CQ-14 — schema versioning when you start doing migrations

---

# 📌 Cross-references

- **DEEP_REVIEW_v2_archive.md** — previous review (fully resolved), archived for reference
- **PROJECT_NOTES.md** — authoritative project state
- **APP_STORE_REVIEW_NOTES.md** — paste-ready review notes for submission
- **Animations.md** — animation spec + completed phase notes
- Per-game specs: CONQUIAN_SPEC.md / WILDROUND_SPEC.md / LASTCARD_SPEC.md

---

# 📝 Session log

### Session 1 — 2026-05-17 (this doc created)
- v3 review created (this doc)
- v2 work confirmed complete (all v2 boxes were checked off and verified in code)
- Major finding: MultiplayerGameScreen.js Session A visual refactor didn't actually land
- Notable finding: BackHandler useEffect placements may be misplaced in multiple screens (Poker fix already done; others unaudited)

### Session 2 — 2026-06-01 (KICKOFF Task 0 + 0.5 + docs sync)
- Task 0: oriented on the project; read CLAUDE.md, RESPONSIVE_LAYOUT_PLAN.md, KICKOFF.md, DEEP_REVIEW.md, PROJECT_NOTES.md, App.js, Card.js.
- Task 0.5: hooks-order audit across all 9 game screens. **BUG-2 resolved** — only WildRound was broken (BackHandler `useEffect` below the `!gameState` guard); fixed in commit `9bd069a`.
- Docs sync: corrected `expo-av` → `expo-audio`, refreshed the PROJECT_NOTES dependency list + file tree to match the actual `screens/` `components/` `game/` files, fixed CLAUDE.md "9 games" → "8 games / 9 screens", and annotated the portrait-vs-default orientation state. PROJECT_NOTES.md confirmed as the canonical "current state" doc.
- Test foundation (IMP-2): added a lean, app-decoupled Jest setup (`npm test`) and 150 unit tests covering ALL 7 pure logic modules — deck/blackjack, poker (hand ranking), conquian (7-J run), rummy (melds/deadwood), lastCard (play legality), solitaire (move legality), wildround (round/scoring). `jest.setup.js` shims the `__DEV__` global. Not covered yet: reducers, AI, networking.
- Notes: Tasks 1–4 (gesture/animation foundation + responsive Solitaire pilot + drag test) not yet started.

### Session 3 — 2026-06-02 (safe-fixes batch + deep-dive review)
- Fixes landed: **BUG-4** auto-save throttle ×4 screens (`5748463`); **CQ-13** removed the vestigial `typescript` dep (`3eb638a`).
- **UX-1** — initially looked like a trivial color swap but white-on-`#7fb3ff` fails contrast (~2.1:1); implemented properly with blue bg + dark button text + a per-state text style. Commit `aeeca46`.
- **Deep-dive review** of GameNetwork, gameSaves, wallet, ErrorBoundary, MultiplayerGameScreen, LobbyScreen:
  - **BUG-1 → resolved** (new multiplayer layout is in place; old section styles gone).
  - **BUG-3 → resolved** (`stopBroadcasting()` now in all lobby exit paths).
  - **BUG-6 (new, high)** — TCP messages aren't reassembled; large broadcasts fragment and get silently dropped → multiplayer desync. Fix recipe documented above.
  - Verified still-open/deferred: CQ-14 (raw `JSON.parse`, no schema), PERF-3 (full-state broadcast — compounds BUG-6). `wallet.js` looks solid (write-serializing queue); `ErrorBoundary` fine.
- Incidental: `react-native-reanimated` is already present in `node_modules` as a transitive dep (not in package.json) — relevant to KICKOFF Task 1.
- **Fixes landed same day** (all device-free to write, verify on device): **BUG-6** TCP reassembly buffer (`734dae9`), **UX-1** theme accent + contrast (`aeeca46`), **UX-2** conditional Blackjack modal delay (`fd37a71`), **ACC-1** hide decorative dots/ghosts from screen readers (`79bc656`). **ACC-2 deferred** (ref → no re-render; needs a state flag). Remaining open bug: **BUG-5** (WildRound save/resume — a feature, needs a design pass). Deliberately not touched: CQ-1…12 refactors, PERF-1/2 image rework, CQ-14 (v1.1 schema versioning).

### Session N — [Date]
- [ ] ...
- Notes:

# 📋 Card Night — Comprehensive Code Review

> **Generated:** 2026-05-08
> **Reviewer:** Claude (Opus 4.7) via Claude.ai chat
> **Project state:** Performance & crash-risk pass complete, Rummy hooks bug fixed
> **Publish target:** ~2-3 months out (App Store + Google Play)
> **Total findings:** 6 Critical, 9 High, 10 Medium, 10 Low, 10 UX, 5 Scalability

---

## 🚀 HOW TO USE THIS DOCUMENT

1. The **handoff prompt** at the top is what you paste into Claude Code to start working through fixes.
2. The **action plan** in the middle is the recommended order — start with Critical, work down.
3. The **findings list** at the bottom is the full reference. Each item has an ID (C1, H3, M5, etc.) so you can ask Claude Code to "do M5" without re-explaining.
4. Use the **checkboxes** to track progress as you go.

---

## 📨 CLAUDE CODE HANDOFF PROMPT (Copy-Paste This)

```
I'm starting work on pre-publish prep for my Card Night app. The full review is
in COMPREHENSIVE_REVIEW.md (in the project root). Please READ THAT FILE FIRST,
then read PROJECT_NOTES.md for project context.

I want to start with the MONTH 1 — CRITICAL & STRUCTURAL block from the action
plan in COMPREHENSIVE_REVIEW.md. That includes:

  - C1: Add Android + iOS network permissions to app.json
  - C6 + H3: Add protocolVersion to network messages
  - H1: Delete *.tmp files, update .gitignore
  - H2: Update PROJECT_NOTES.md to reflect ThemeContext refactor
  - M9: Extract useResumePrompt hook, dedupe across 5 screens
  - L1: Add README.md with setup instructions

Skip these items in this session — I'll handle them myself / in another session:
  - C2: Privacy policy (I'll write this separately, hosted on GitHub Pages)
  - C3: App icons, splash, store screenshots (I'll handle assets myself)

═══════════════════════════════════════════════════════════════════════════
RULES FOR THIS SESSION
═══════════════════════════════════════════════════════════════════════════

- Commit to git BEFORE starting each item ("pre-{item-id} snapshot").
- Do items ONE AT A TIME. After each: commit with a clear message, then PAUSE
  and tell me what to test.
- I'm a beginner. Explain what each change does in plain language as you go.
- If a fix requires a NEW EAS build (new native package), warn me FIRST before
  doing it. C1 (permissions) DOES require a new EAS build — flag this clearly
  before kicking it off.
- For C6 + H3 (protocol versioning): bump the protocol version constant to 1
  for v1.0 launch, but design it so future versions can detect mismatches and
  show a friendly "please update" message instead of crashing.
- For M9 (useResumePrompt): create a custom hook in a new file like
  components/useResumePrompt.js or game/useResumePrompt.js. The hook should
  encapsulate: hasSave check + Alert with Continue/Start New buttons + the
  navigate function. Then update SinglePlayerSetupScreen, RummyVariantPicker,
  SolitaireVariantPicker, PokerVariantPicker, and GameSetupScreen to use it.
  Test each one to make sure the resume prompt still works.
- After each item, update the checkbox in COMPREHENSIVE_REVIEW.md by changing
  `- [ ]` to `- [x]` for the completed item.
- If anything is unclear or scope creeps, STOP and ask me before continuing.
- When this whole block is done, update PROJECT_NOTES.md with a brief summary.

═══════════════════════════════════════════════════════════════════════════
ORDER OF EXECUTION
═══════════════════════════════════════════════════════════════════════════

Start with the safest / no-build-required items first, save C1 (the EAS rebuild
trigger) for last so I can test JS-only changes immediately:

  1. H1 — Delete *.tmp files, update .gitignore           (5 mins, JS-only)
  2. L1 — Create README.md                                (10 mins, JS-only)
  3. H2 — Update PROJECT_NOTES.md ThemeContext mention    (5 mins, docs only)
  4. M9 — useResumePrompt hook + refactor 5 screens       (45-60 mins, JS-only)
  5. C6 + H3 — Protocol version in network messages       (30-45 mins, JS-only)
  6. C1 — Android + iOS permissions in app.json           (15 mins, REQUIRES EAS REBUILD)

For step 6, after editing app.json, ASK me before running the EAS build.
```

---

## ✅ ACTION PLAN — RECOMMENDED ORDER

Track progress here. Update checkboxes as items complete.

### 🔴 MONTH 1 — Critical store-blockers + structural cleanup

- [x] **H1** — Delete `*.tmp` files, update `.gitignore` to block them
- [x] **L1** — Add README.md with setup instructions
- [ ] **H2** — Update PROJECT_NOTES.md to reflect ThemeContext refactor
- [ ] **M9** — Extract `useResumePrompt` hook, dedupe across 5 screens
- [ ] **C6 + H3** — Add `protocolVersion` to network messages, reject mismatches
- [ ] **C1** — Add Android + iOS network permissions to `app.json`
- [ ] **C2** — Write privacy policy, host it (GitHub Pages is free)
- [ ] **C3** — Final app icons, splash screen, store screenshots

### 🟡 MONTH 2 — Polish + UX critical wins

- [ ] **UX1** — Soft-redirect to Profile instead of forced redirect
- [ ] **UX3** — Quit Game button in all game screens
- [ ] **UX5** — Tap-to-copy IP in HostSetupScreen
- [ ] **UX6** — Toast messages for illegal moves
- [ ] **M4** — Strip `console.log` calls in production
- [ ] **M5** — Sweep hardcoded sizes, replace with `scale()`/`scaleFont()`
- [ ] **M6** — Decide what to do with ResultsScreen (use it or remove it)
- [ ] **M7** — Decide what to do with SettingsScreen (use it or remove it)
- [ ] **L8** — Decide on "Coming Soon" buttons (remove or label clearly)
- [ ] **UX4** — Basic card-flip + win sounds (huge perceived quality boost)

### 🟢 MONTH 3 — Final pre-launch

- [ ] **C4** — Document wallet "trust model" (not encrypted, fine for v1)
- [ ] **C5** — Write App Store review notes explaining local-network use
- [ ] Manual test pass: every game × every variant × single + multiplayer
- [ ] Test on lowest-end Android phone available
- [ ] Test on at least one real iPhone
- [ ] EAS production build, test the actual binary
- [ ] **UX10 + L9** — About screen, basic stats display
- [ ] **UX2** — First-time tutorial overlays (at least Blackjack + 1 rummy variant)
- [ ] Submit to TestFlight (iOS) for ≥1 week of real testing before final submit

### 🔵 POST-LAUNCH v1.1+ (Future)

- [ ] **M1** — Extract `useMultiplayerGame` hook
- [ ] **S1** — Centralize game registry
- [ ] **H7** — Add tests (Jest, 1-2 per game logic file)
- [ ] **H8** — Standardize ES modules everywhere
- [ ] **S5** — Schema version + migrations for stored data
- [ ] **S3** — i18n infrastructure (English + Spanish)
- [ ] **C4** — Wallet encryption before adding leaderboard feature
- [ ] Resume the visual theme project (paused for better PC)

---

# 📚 FULL FINDINGS REFERENCE

Findings organized by severity. Each has a unique ID — reference these when
talking to Claude Code (e.g., "do M5" or "is H4 still valid?").

---

## 🟥 CRITICAL — Fix before publishing

### C1. No `NetworkInfo` permissions for Android local network discovery

**Problem:** Android 13+ requires `NEARBY_WIFI_DEVICES` permission to use local
network features. Your UDP discovery (the whole "find a game automatically"
feature) will silently fail on newer Android phones once you ship to the Play
Store, because Expo Go's permissions aren't the same as a published app's.

**Where:** `app.json`

**Fix:** Add to `app.json`:
```json
"android": {
  "permissions": [
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.ACCESS_WIFI_STATE",
    "android.permission.NEARBY_WIFI_DEVICES",
    "android.permission.INTERNET"
  ]
}
```

Also need iOS local network description (App Store will reject without it):
```json
"ios": {
  "infoPlist": {
    "NSLocalNetworkUsageDescription": "Card Night uses your local network to connect with nearby phones for multiplayer games. No internet connection is required.",
    "NSBonjourServices": ["_cardnight._tcp"]
  }
}
```

**Note:** Requires a new EAS build to take effect.

---

### C2. Privacy policy required for both stores

**Problem:** Both Apple and Google require a privacy policy URL even if you
don't collect data. You'll be rejected without one.

**Why it applies:** You request camera + photo library permissions (profile
photos), even for opt-in/local use.

**Fix:** Need a privacy policy hosted somewhere. Free options: GitHub Pages,
your own domain, even a Notion page made public. Should state:
- No data collection
- Photos stay on device
- No analytics
- No third-party SDKs sending data anywhere

---

### C3. App icons + splash screen are likely defaults

**Problem:** Current `app.json` references `./assets/icon.png`,
`./assets/splash-icon.png`, etc. — but these may still be Expo placeholder
defaults. Default icons get auto-rejected.

**Fix:** Need:
- iOS icon: 1024×1024 PNG (no transparency)
- Android adaptive icon: 432×432 foreground PNG with safe zone
- Splash screen image
- Feature graphic for Play Store: 1024×500
- iOS App Store screenshots: 6.7" iPhone (1290×2796) at minimum

---

### C4. AsyncStorage is unencrypted — wallet coin balance can be tampered with

**Problem:** `wallet.js` stores coin balance in plain AsyncStorage. A user with
a rooted Android device can edit the file and give themselves millions of coins.

**Why it matters:** Once you have a "tier list / leaderboard" feature (which is
in your roadmap), this becomes exploitable for cheating.

**Status for v1.0:** Fine since coins are local-only and there's no leaderboard
yet. **Mark for the future** — must address before adding the leaderboard.

---

### C5. `react-native-tcp-socket` and `react-native-udp` are community packages — no Apple guarantee

**Problem:** Apple's review process can be unpredictable about apps that open
raw TCP sockets. Some get approved, some get asked "what's this for?" and need
explanation.

**What you'll need:** A clear explanation in your App Store review notes that
this is for local-only multiplayer (no internet, no servers, just direct
phone-to-phone on the same WiFi).

---

### C6. No protocol version / update strategy for multiplayer messages

**Problem:** `app.json` has `"version": "1.0.0"` but no plan for breaking
changes (e.g., what happens when v1.1 multiplayer can't talk to v1.0
multiplayer?).

**Fix:** Before launch, add a protocol version field to your network messages
so older/newer clients can detect mismatches:
```javascript
// In every message
{ type: "JOIN", protocolVersion: 1, name: "..." }
```
Reject connections from mismatched versions with a friendly "please update"
message.

---

## 🟧 HIGH PRIORITY — Major bugs / scalability blockers

### H1. Stale temp files committed to repo

**Problem:** `old_poker_screen.tmp` and similar files in the repo are leftovers
from refactors.

**Fix:** Delete them. Add `*.tmp` to `.gitignore` to prevent re-introduction.

---

### H2. PROJECT_NOTES.md describes old Card.js architecture

**Problem:** Notes say *"Card.js — uses cardTheme.js, subscribes to live
changes via `useEffect`"* — but you actually moved to context. Future devs
(or future Claude Code sessions) will be misled.

**Fix:** Update PROJECT_NOTES.md to reflect: `Card.js — uses ThemeContext via
useTheme(), wrapped in React.memo`.

---

### H3. No protocol versioning between host and clients

(Same root issue as C6 — bundled together.) When v1.1 ships and v1.0 users
try to join, they'll get cryptic failures or worse — partial state corruption.
Add `protocolVersion` to every network message and check it on receive.

---

### H4. No graceful handling when `loadProfile` fails on app launch

**Problem:** In `App.js`:
```javascript
loadProfile().then((profile) => {
  if (profile?.cardTheme) {
    setTheme(profile.cardTheme);
  }
});
```
No `.catch()`. If AsyncStorage is corrupt, the unhandled promise rejection
silently swallows. Theme stays default. No user feedback.

**Fix:** Add `.catch(error => console.warn("Failed to load profile theme:",
error))` and consider error reporting.

---

### H5. `cardTheme.js` mixes ES modules and a non-ES side effect

**Problem:** `cardTheme.js` calls `updateProfile({ cardTheme: key }).catch(()
=> {})` from inside `setTheme()` — but `updateProfile` is imported from
`profile.js`. There's a circular import risk here.

**Fix:** Search the file for `import { updateProfile }` — if it's there,
that's a circular dep. The cleanest fix is to lift the persistence to wherever
calls `setTheme()` (e.g., the CardThemeScreen) instead of having `setTheme`
itself save.

---

### H6. Image picker permissions rejection has no path forward

**Problem:** In `ProfileScreen.js`, when user denies camera/library permission,
you show an Alert and exit. No "Open Settings" option to let them reconsider.

**Fix:** Add a button in the alert that calls `Linking.openSettings()` so they
can grant permission without uninstalling/reinstalling.

---

### H7. No tests anywhere

**Problem:** All your game logic is in pure functions (good!) but no automated
tests exist. The Rummy crash that was just fixed could have been caught by
even a basic "does the screen render" test.

**Fix:** Not required for v1.0, but worth adding for v1.1. Suggested: 1-2 unit
tests per game's logic file (Jest is built into React Native).

---

### H8. `solitaire.js` exports use `module.exports` but other game files use `export`

**Problem:** Inconsistent module style across the codebase makes it confusing
to maintain. Some files: `export function`. Others: `module.exports = { ... }`.
Some screens use `import`, others use `require()`.

**Fix:** Pick one (recommend `export` / `import` since that's modern React
Native convention) and convert everything in a future cleanup pass. NOT
urgent — works fine — but hurts scalability.

---

### H9. `getDefaultProfile()` not called consistently — null guard inconsistency

**Problem:** `getCachedProfile()` returns `cachedProfile || getDefaultProfile()`,
but elsewhere code does `if (!profile)`. Different ways of checking for "no
profile yet."

**Fix:** Pick one source of truth — always go through `getCachedProfile()` so
the "default" fallback is automatic.

---

## 🟨 MEDIUM PRIORITY — Code quality / maintainability

### M1. The 8 game screens follow nearly the same pattern with slight variations

**Pattern duplication:** `LastCardGameScreen`, `ConquianGameScreen`,
`RummyGameScreen`, `WildRoundGameScreen`, `GoFishGameScreen`,
`PokerGameScreen` — all do `fullRef` + `applyState` + `toPublic` +
`setServerListeners` + `setClientListeners` + auto-save.

**Fix:** Extract a shared custom hook like `useMultiplayerGame({ initialState,
reducer, ... })` to centralize the boilerplate. Will make adding game #9 way
easier.

**Effort:** 3-4 hours, but big payoff for scalability.

---

### M2. `App.js` still imports every screen statically

**Why:** Lazy-loading screens isn't urgent — your app doesn't *have* to do it
— but as you add more games, startup time will keep creeping up.

**Fix when you have time:** Use `React.lazy()` with `<Suspense>` for game
screens.

---

### M3. `RummyVariantPickerScreen.js` includes Conquián option, but Conquián has its own flow elsewhere

Currently: when user picks Conquian from the Rummy variant list, where does it
go? Looking at the screen code, it builds a launchPayload but the path through
`dispatchAction` for Conquian vs Rummy isn't entirely consistent. Worth a
manual test.

**Fix:** Either fully merge Conquián into the Rummy variant list (and use the
same screen for both) OR remove it from this list entirely and keep its own
entry point. Right now it's halfway between.

---

### M4. Extensive `console.log` calls left in production code

**Where:** `GameNetwork.js`, `cardTheme.js`, others — plenty of
`console.log("[GameNetwork] ...")` calls.

**Why it matters:** Production builds still process these (unless you strip
them). Slight perf hit + potential info leakage in crash reports.

**Fix:** Use a logger helper:
```javascript
const log = __DEV__ ? console.log : () => {};
```
Replace all `console.log` with `log`. Easy find-and-replace.

---

### M5. `responsive.js` is a good system but isn't used everywhere

**Where:** Many newer files (e.g., `RummyVariantPickerScreen.js`,
`GameSetupScreen.js`) use hardcoded sizes (`fontSize: 30`, `padding: 24`)
instead of `scaleFont(30)` and `scale(24)`.

**Why it matters:** The whole point of `responsive.js` is consistent scaling
on small phones and tablets. Half-using it means inconsistent sizing.

**Fix:** Sweep all hardcoded numeric `fontSize:`, `padding:`, `margin:`,
`width:`, `height:` and replace with `scaleFont()` / `scale()`.

---

### M6. `ResultsScreen.js` is a placeholder ("Coming soon!") but is registered in navigation

**Problem:** Dead route. If anyone navigates there by accident (or via a stale
link), they see "Results Screen — Coming soon!" — confusing and unprofessional.

**Fix:** Either remove the screen + the navigation entry, or actually use it
for end-of-game results across all games.

---

### M7. `SettingsScreen` also a placeholder, but linked from HomeScreen

**Same problem as M6.** HomeScreen has "⚙️ Settings" linking to a screen that
says "More settings coming soon." Looks unfinished to a user.

**Fix:** Either remove the link from HomeScreen until you have real settings,
or merge it into the Profile screen.

---

### M8. No rate limiting on UDP discovery broadcast

**Problem:** Host broadcasts every 2 seconds forever once started. If a host
keeps the app open for hours in the lobby, this spams the local network.

**Fix:** Auto-stop broadcasting after the game starts. Currently looks like
it's stopped on lobby unmount only.

---

### M9. The "Continue or Start New?" prompt is duplicated across many screens

**Where:** `SinglePlayerSetupScreen.js`, `RummyVariantPickerScreen.js`,
`SolitaireVariantPickerScreen.js`, `PokerVariantPickerScreen.js`,
`GameSetupScreen.js`.

**The fix from your own UPDATE_PROMPT.md:** *"To avoid copy-pasting the modal
logic across many screens, it's worth creating a small helper hook or
component — for example `useResumePrompt(gameKey, gameName)`."*

This wasn't done yet. Now that you have 5+ screens with this code copy-pasted,
it's worth doing.

---

### M10. Wild Round content (100 prompts + 300 answers) is in JSON — but JSON is bundled into the app

**Problem:** Static cards file is shipped on every install, and updating cards
requires a full app rebuild.

**Fix when you have time:** Optional — could load card content from a remote
JSON URL for over-the-air content updates without app store resubmission.
Adds complexity though, so weigh the tradeoff.

---

## 🟦 LOW PRIORITY — Nitpicks & polish

### L1. No README.md

**Why it matters:** Future-you (or anyone you collaborate with) opens the
GitHub repo and has no quick "how to run this" guide. PROJECT_NOTES.md is
great but more for state, not setup.

**Fix:** Tiny README with: prerequisites, `npm install`, `npm start`, link to
PROJECT_NOTES.md.

---

### L2. `package.json` doesn't pin Sharp to a major version

**Fix:** `"sharp": "^0.34.5"` is fine but consider `"~0.34.5"` so unexpected
major version jumps don't break the compress script.

---

### L3. `wildroundCards.json` has tone field but it's used inconsistently

**Problem:** "mature" filter logic in `wildround.js`:
```javascript
const filter = tone === "mature" ? () => true : (c) => c.tone === "family";
```
Means "mature mode" includes BOTH family and mature. Subtle thing but worth
a comment in the code so a future reader doesn't mistake "mature mode" for
"mature only."

---

### L4. PokerGameScreen, ConquianGameScreen use single quotes in some spots, double in others

Inconsistent code style. Run Prettier with consistent rules across all files.

---

### L5. Naming inconsistency: `selectedHandIds` (Set) vs `selectedHandIndexes` (array)

Conquian uses `Set`, Rummy uses `array of indexes`. Both work but pick one
convention for new games. Worth flagging in PROJECT_NOTES so you don't forget
which is which.

---

### L6. The `THEMES_LIST` export shape

Looking at uses: `THEMES_LIST.find(([key]) => key === ...)` — it's an array
of `[key, label]` tuples. Works but JSON-style `{ key: 'neon', label: 'Neon' }`
would be more readable.

---

### L7. SinglePlayerSetupScreen has a long `if/else` chain

```javascript
if (game.id === "blackjack") { ... }
if (game.id === "poker") { ... }
if (game.id === "solitaire") { ... }
// etc.
```
Could be cleaner as a lookup table. Minor.

---

### L8. Multiplayer button labels "Host Online" / "Join Online" say "Coming Soon"

**UX nit:** "Coming Soon" buttons don't get tapped, but they're visually
confusing — users wonder why they can't tap them.

**Fix:** Either remove those buttons until the feature ships, or add a small
explanatory subtitle ("Internet multiplayer — coming soon").

---

### L9. No "About" or "Credits" screen

Stores often want this. Easy to add.

---

### L10. No haptic feedback on button taps

**Fix:** `expo-haptics` adds nice tactile feedback on critical actions
(deal, win, etc.). Adds polish for free.

---

## 📱 USER EXPERIENCE FINDINGS

### UX1. First-launch onboarding force-redirects to Profile

**Behavior:** If user has no name set, HomeScreen.js auto-navigates them to
Profile. They can't get back to Home until they save a name.

**Issue:** Some users will resist this. Better to show Home with locked
Single Player button (with "Set up profile to play" text) so users see the
app first.

---

### UX2. No tutorial or first-game guidance

**Problem:** The "How to Play" screen exists, but it's only reached via a
small link on Home. New users likely just tap "Single Player" → "Blackjack"
→ and might not know how Blackjack works.

**Fix:** First time a user plays a specific game, show a 2-3 screen tutorial
overlay. Optional — but huge for retention.

---

### UX3. No way to leave a game mid-session

**Problem:** Once in a game, the only way out is the back button (header).
On Android this works; on iOS it's hidden by default in some flows. Players
might feel "stuck."

**Fix:** Add a small "End Game" / "Quit" button in each game screen with a
confirmation modal.

---

### UX4. No sound/music

You mentioned "Visual polish, animations, sounds" is paused — but for App
Store submission, sounds significantly impact perceived quality. Worth at
least basic card-flip / win sounds before launch.

---

### UX5. Hostname/IP not copyable

**In HostSetupScreen:** IP address shown but you can't tap to copy. If
discovery fails, manually entering an IP is the fallback — but the host
can't easily share theirs.

**Fix:** Make the IP tap-to-copy. Use `expo-clipboard`.

---

### UX6. No haptic / visual feedback on illegal moves

**Where:** When a player tries an invalid move (e.g., invalid Conquián meld),
the state silently doesn't change. New players might think the app is broken.

**Fix:** Always show a brief "That's not a valid move" toast/banner.

---

### UX7. Wallet coin balance not visible during games

You wired this in some places but not all. Worth a sweep to confirm all
single-player game screens show the wallet balance.

---

### UX8. No "What's New" screen for app updates

Users updating from v1.0 → v1.1 won't know what changed. Easy add via a
stored `lastSeenVersion` in AsyncStorage and a one-time modal.

---

### UX9. Conquian / Wild Round / Rummy have variant-specific rules that aren't explained inline

The HowToPlay screen covers basics but doesn't explain that, e.g., Indian
Rummy requires "two runs and one pure run." Players will Google. Better:
tap-to-expand rules inside the variant picker.

---

### UX10. No way to see your own stats (lifetime wins, etc.)

`profile.stats` field exists in profile.js but isn't populated or displayed.
Stats are a cheap retention feature.

---

## 🚀 SCALABILITY CONCERNS

### S1. Adding a new game means touching 6+ files

Right now to add Game #9 you'd need to: create game logic, create screen, add
to App.js, add to LobbyScreen GAMES array, add to SinglePlayerSetupScreen
CAROUSEL_GAMES, add to HowToPlayScreen GAMES, possibly add VariantPicker, add
to PROJECT_NOTES.

**Fix:** Centralize game registration:
```javascript
// game/registry.js
export const GAMES = [
  {
    id: 'blackjack',
    label: 'Blackjack',
    screen: 'Game',
    multiplayerScreen: 'MultiplayerGame',
    aiRange: [0, 0],
    minPlayers: 1, maxPlayers: 4,
    rules: { ... },
    thumbnail: require('...'),
    // etc.
  },
];
```
Every other file imports from here. Adding a new game becomes "edit one file."

---

### S2. Theme assets folder structure isn't auto-discovered

To add a 9th theme, you'd need to manually add 53 `require()` calls to
cardTheme.js. Painful.

**Fix:** Could use Expo's asset module to enumerate files at bundle time.
Optional optimization.

---

### S3. No internationalization (i18n) infrastructure

You mentioned multi-language (English + Spanish) on the roadmap. None of your
strings are externalized. Translating later means touching every screen.

**Fix when ready for i18n:** Use `react-i18next` and gradually move strings
to `en.json` / `es.json` files.

---

### S4. Ports 7777 and 7778 are hardcoded

If they conflict with other apps on the user's network (rare but possible),
no fallback. Could randomize or fall back to the next available port.

---

### S5. Wallet/profile/save data has no migration path

If you change the schema in v1.1, existing v1.0 users hit JSON.parse errors
and lose data. There's *some* fallback in profile.js (`normalizeProfile`)
but no version field.

**Fix:** Add `schemaVersion: 1` to all stored data, write migrations for
future versions.

---

# 📒 SESSION NOTES

Track what gets done across sessions here. Add a new entry each time you work
through items.

## Session Log

### Session 1 — [Date]
*Items completed:*
- [ ] (none yet — fill in as you go)

*Notes:*
- (any context worth remembering)

---

## Cross-References

- **Original perf/crash review:** Performed before this comprehensive review;
  fixes are already applied (Card image compression, ThemeContext, ErrorBoundary,
  AI setTimeout cleanup, AppState server cleanup, Rummy hooks crash).
- **PROJECT_NOTES.md:** Authoritative state of the project (what's built, what's next)
- **UPDATE_PROMPT.md:** Coin economy + betting + save/resume spec — completed
- **CONQUIAN_SPEC.md:** Conquián game spec
- **WILDROUND_SPEC.md:** Wild Round game spec

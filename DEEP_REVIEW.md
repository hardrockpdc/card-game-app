# 🔍 Card Night — Deep Code Review (2026-05-13)

> **Fresh review** performed independently of `COMPREHENSIVE_REVIEW.md`.
> Items are tagged where they overlap with the existing review doc.
> Tackle these bit by bit — start with Critical, then High, etc.

---

## 📋 How to use this file

- Each item has a unique ID (e.g. `CR-1`, `HI-2`) — reference these when working through them
- Check off `- [ ]` → `- [x]` as you complete items
- Items are roughly ordered by effort within each section (easiest first)
- "Beginner-friendly" fixes are spelled out in detail
- Estimated time is included where possible

---

## ✅ Progress Tracker

### 🔴 Critical (CR-1 through CR-6)
- [x] ~~**CR-1**~~ — Break circular import: cardTheme.js ↔ profile.js
- [x] ~~**CR-2**~~ — MultiplayerGameScreen re-uses stale `initialPlayers` for redeals
- [x] ~~**CR-3** — LobbyScreen useEffect dependency issues~~
- [x] ~~**CR-4** — Solitaire restore vs new-game race on mount (visible flash)~~
- [x] ~~**CR-5** — Document setServerListeners/setClientListeners last-write-wins behavior~~
- [x] ~~**CR-6** — Rummy uses CommonJS while everything else uses ES modules~~

### 🟠 High (HI-1 through HI-10)
- [x] ~~**HI-1** — cardTheme subscribe() return value~~ ✅ (verified correct, no action needed)
- [x] ~~**HI-2** — wallet.js getCoins crashes on corrupted storage~~
- [x] ~~**HI-3** — addCoins/subtractCoins race condition (no atomicity)~~
- [x] ~~**HI-4** — App.js loadProfile().then() missing .catch~~
- [ ] **HI-5** — Network message field shape inconsistencies
- [x] ~~**HI-6** — LastCard scheduleTimeout might not cancel previous timer~~
- [x] ~~**HI-7** — WildRound AI effect deps brittle~~
- [x] ~~**HI-8** — LobbyScreen aiPlayersRef pattern~~ ✅ (verified correct)
- [x] ~~**HI-9** — JoinScreen clearInterval(null) cosmetic cleanup~~
- [x] ~~**HI-10** — Solitaire clearGame fires redundantly after win~~

### 🟡 Medium (M-1 through M-11)
- [ ] **M-1** — Extract useMultiplayerGame hook (matches old M1)
- [ ] **M-2** — Centralize game registry (matches old S1)
- [ ] **M-3** — Replace remaining console.log with logger.log
- [ ] **M-4** — Move LastCard image map to its own file
- [ ] **M-5** — Split cardTheme.js into per-theme files
- [ ] **M-6** — recordWin race condition (same pattern as HI-3)
- [ ] **M-7** — LobbyScreen handler closure stale-state risk
- [ ] **M-8** — Centralize magic numbers into config file
- [ ] **M-9** — Move multiplayer Blackjack logic to game/blackjack.js
- [x] ~~**M-10** — Standardize import/require (resolved by CR-6)~~
- [ ] **M-11** — getDefaultProfile fresh-object inconsistency

### 🟢 Low (L-1 through L-12)
- [x] ~~**L-1** — Add comment to index.js (auto-generated note)~~
- [x] ~~**L-2** — Audit package.json for unused web deps — AUDITED: kept all three. `expo start --web` script makes them dev-only conveniences. No source files import them directly. Negligible cost; removal would only matter if dropping web target entirely.~~
- [x] ~~**L-3** — Verify wildround.js has no top-level test code running at import — CONFIRMED dormant: runTests() is exported but never called anywhere in committed code.~~
- [ ] **L-4** — Resolve Conquian's half-state in RummyVariantPicker (matches old M3)
- [x] ~~**L-5** — Decide: keep or remove Settings/Results dead routes — DECIDED: keep both. Results is used by WildRound game-over navigation. Settings is a placeholder for future settings.~~
- [x] ~~**L-6** — Style object memoization — SKIPPED for v1 per review note. Not worth the complexity.~~
- [ ] **L-7** — Auto-stop UDP broadcast after game starts (matches old M8)
- [ ] **L-8** — Standardize String(id) vs raw id comparisons
- [ ] **L-9** — ProfileScreen + CardThemeScreen double subscription
- [x] ~~**L-10** — gameSaves.js silent catches → add warn logging~~
- [ ] **L-11** — Verify lastCard.js action functions are pure
- [ ] **L-12** — Standardize SafeAreaView / KeyboardAvoidingView usage

### 🚀 Improvements (S-1 through S-7)
- [ ] **S-1** — `__DEV__` debug overlay
- [ ] **S-2** — Jest tests for game logic
- [ ] **S-3** — Remote-loadable cards (matches old M10)
- [ ] **S-4** — Centralized "round-over" helper
- [ ] **S-5** — "Quick Match" button on Home
- [ ] **S-6** — Dev-mode tools screen
- [ ] **S-7** — Schema versioning for saves (matches old S5)

---

# 🔴 CRITICAL — Bugs that will hit real users

These are bugs that could crash, corrupt data, or silently fail.

---

## CR-1. Circular import: `cardTheme.js` ↔ `profile.js`

**Status:** New finding (related to old H5)
**Effort:** ~15 minutes
**Risk if ignored:** Crash on cold start after future refactors

### The problem

- `game/cardTheme.js` imports `updateProfile` from `./profile`
- `game/profile.js` doesn't directly import cardTheme, but it's used together everywhere
- `App.js` imports both and calls them in sequence on startup
- Currently survives because `updateProfile` is called *inside* `setTheme()`, not at module top level

If anyone ever moves the call to top level (or if Metro's bundling order changes), you get `undefined is not a function` on cold start.

### Why it matters

It's a ticking time bomb. Works today, breaks silently the day someone refactors.

### Fix

Make `cardTheme.js` a dumb singleton that doesn't know about profiles. Move the persistence to whoever *calls* setTheme.

**In `cardTheme.js`** — remove the profile import and the persistence:
```javascript
// DELETE this line at top:
// import { updateProfile } from "./profile";

export function setTheme(key) {
  if (!ALL_IMAGES[key]) return;
  _active = key;
  _listeners.forEach((fn) => fn(key));
  // DELETE this line:
  // updateProfile({ cardTheme: key }).catch(() => {});
}
```

**In `screens/CardThemeScreen.js`** — `handleApply` already calls `setTheme`. Add the save call:
```javascript
import { updateProfile } from "../game/profile";

function handleApply() {
  const [key] = THEMES_LIST[currentIndex];
  setTheme(key);
  updateProfile({ cardTheme: key }).catch(() => {});  // ADD THIS
  setActiveTheme(key);
  ...
}
```

**Also check `ProfileScreen.js`** if it ever calls `setTheme` directly — apply the same pattern.

---

## CR-2. `MultiplayerGameScreen.js` uses stale `initialPlayers` for redeals

**Status:** New finding
**Effort:** ~20 minutes (or comment-only for v1)
**Risk if ignored:** Ghost players if someone disconnects between hands

### The problem

```javascript
function handlePlayAgain() {
  applyState(dealCards(initialPlayers, nextHandNumber));  // initialPlayers from route.params, never updated
}
```

`initialPlayers` comes from route params at mount time. If a player disconnects between hand 1 and hand 2, they're still in `initialPlayers` and the deck is dealt as if they're playing.

### Fix (proper)

Maintain a live `currentPlayersRef` that updates when `onClientLeft` fires:

```javascript
const currentPlayersRef = useRef(initialPlayers);

setServerListeners({
  onClientLeft: ({ id }) => {
    currentPlayersRef.current = currentPlayersRef.current.filter(
      (p) => String(p.id) !== String(id)
    );
    // ... rest of handler
  },
});

function handlePlayAgain() {
  applyState(dealCards(currentPlayersRef.current, nextHandNumber));
}
```

### Fix (v1 quickfix)

Just add a `// TODO:` comment near `handlePlayAgain` so future-you knows. Most multiplayer sessions don't have mid-game disconnect followed by replay anyway.

---

## CR-3. `LobbyScreen.js` `useEffect` dependency issues

**Status:** New finding
**Effort:** ~10 minutes
**Risk if ignored:** Effects re-run more than expected

### The problem

```javascript
useEffect(() => {
  if (route.params?.selectedPokerVariant) {
    setSelectedPokerVariant(route.params.selectedPokerVariant);
  }
}, [route.params?.selectedPokerVariant]);
```

`route.params` is a new object on every navigation, so `route.params?.X` might fire more than intended.

### Fix

Extract to a local variable so the dep is a primitive:

```javascript
const incomingPokerVariant = route.params?.selectedPokerVariant;
useEffect(() => {
  if (incomingPokerVariant) {
    setSelectedPokerVariant(incomingPokerVariant);
  }
}, [incomingPokerVariant]);
```

Same for the rummy variant effect.

---

## CR-4. Solitaire restore vs. new-game race on mount

**Status:** New finding
**Effort:** ~10 minutes
**Risk if ignored:** Brief visual flash of a fresh game before saved game restores

### The problem

`SolitaireGameScreen.js` has two effects on mount:
1. `useEffect(() => { dispatch(newGameAction(...)); }, [routeVariantId, routeSpiderMode])` — fires first
2. `useEffect(() => { if (resumeFromSave) { ... await loadGame ... dispatch(__RESTORE__) } }, [])` — fires second, but has `await`

On a resume, the user sees a fresh-deal flash before the saved game appears.

### Fix

Gate effect 1 on `!resumeFromSave`:

```javascript
useEffect(() => {
  if (route?.params?.resumeFromSave) return;  // ADD THIS LINE
  initialGameDispatched.current = true;
  dispatch(newGameAction(routeVariantId, { spiderMode: routeSpiderMode }));
  coinRewardedRef.current = false;
  setCoinsEarned(0);
  setElapsed(0);
}, [routeVariantId, routeSpiderMode]);
```

---

## CR-5. Document `setServerListeners`/`setClientListeners` last-write-wins

**Status:** New finding
**Effort:** ~5 minutes (just a comment for v1)
**Risk if ignored:** Hard-to-debug "missed message" issues if two screens are briefly mounted

### The problem

`GameNetwork.js` uses module-level singleton listener objects. Every screen that calls `setServerListeners({ ... })` replaces the previous one entirely. If two screens are mounted simultaneously (rare but possible during nav transitions), the second wins and the first stops receiving messages.

### Fix (v1)

Add a comment in `GameNetwork.js` above `setServerListeners`:
```javascript
// NOTE: Only one screen can listen at a time. Calling this replaces the
// previous listeners entirely. If you need multiple listeners, refactor
// to an array-based subscription model.
export function setServerListeners(listeners) { ... }
```

### Fix (proper, v1.1+)

Refactor to a subscriber/array pattern where each screen `.subscribe()` and gets an unsubscribe function on cleanup.

---

## CR-6. `rummy.js` uses CommonJS while everything else uses ES modules

**Status:** Confirmed from old H8
**Effort:** ~30 minutes
**Risk if ignored:** None today, but inconsistency makes maintenance harder

### The problem

```javascript
// game/rummy.js
const { createDeck, shuffleDeck } = require("./deck");
module.exports = { ... };
```
vs everything else:
```javascript
import { createDeck, shuffleDeck } from "./deck";
export function ...
```

`RummyGameScreen.js` and `LobbyScreen.js` then do:
```javascript
const { createRummyState, ... } = require("../game/rummy");
```

### Fix

Convert `rummy.js` to ES modules:

```javascript
import { createDeck, shuffleDeck } from "./deck";

// ... all functions get `export` prefix:
export function createRummyState(...) { ... }
export function rummyReducer(...) { ... }
// ... etc

// DELETE the module.exports block at the bottom
```

Then update the consumers:
```javascript
// RummyGameScreen.js, LobbyScreen.js, etc.
import {
  createRummyState,
  rummyReducer,
  rummyAiChooseMove,
  getRummyVariantLabel,
  calculateRummyDeadwood,
  getRummyVariantPlayerLimits,
} from "../game/rummy";
```

Test thoroughly — there are a lot of exports and you don't want to miss one.

---

# 🟠 HIGH PRIORITY — Significant issues, not crashes

---

## HI-1. ✅ Verified correct (no action needed)

`subscribe()` in `cardTheme.js` correctly returns an unsubscribe function. Initial concern withdrawn after re-reading.

---

## HI-2. `wallet.js` `getCoins` crashes on corrupted storage

**Status:** New finding
**Effort:** ~5 minutes
**Risk if ignored:** Crash if AsyncStorage is corrupted, NaN if data is malformed

### The problem

```javascript
export async function getCoins() {
  const raw = await AsyncStorage.getItem(KEY_COINS);  // can reject
  if (raw === null) { ... }
  return parseInt(raw, 10);  // NaN if raw is bad
}
```

`NaN` flows into the UI and breaks comparisons (`coins < bet` → false).

### Fix

```javascript
export async function getCoins() {
  try {
    const raw = await AsyncStorage.getItem(KEY_COINS);
    if (raw === null) {
      await AsyncStorage.setItem(KEY_COINS, String(STARTING_BALANCE));
      return STARTING_BALANCE;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : STARTING_BALANCE;
  } catch {
    return STARTING_BALANCE;
  }
}
```

Apply the same pattern to `getLifetimeEarned`.

---

## HI-3. `addCoins`/`subtractCoins` race condition

**Status:** New finding
**Effort:** ~15 minutes
**Risk if ignored:** Lost coins under concurrent calls (rare in practice)

### The problem

```javascript
export async function addCoins(amount) {
  const current = await getCoins();    // <-- async gap
  const next = current + Math.floor(amount);
  await setCoins(next);                 // <-- another async gap
  const rawLifetime = await AsyncStorage.getItem(KEY_LIFETIME);
  ...
}
```

Two concurrent calls can both read `current = 1000`, both write `1050`, losing 50 coins.

### Fix

Add a simple in-memory queue:

```javascript
// At top of wallet.js
let walletQueue = Promise.resolve();
function enqueue(fn) {
  walletQueue = walletQueue.then(fn, fn);
  return walletQueue;
}

export async function addCoins(amount) {
  return enqueue(async () => {
    const current = await getCoins();
    const next = current + Math.floor(amount);
    await setCoins(next);
    const rawLifetime = await AsyncStorage.getItem(KEY_LIFETIME);
    const lifetime = rawLifetime === null ? 0 : parseInt(rawLifetime, 10);
    await AsyncStorage.setItem(KEY_LIFETIME, String(lifetime + Math.floor(amount)));
    return next;
  });
}

export async function subtractCoins(amount) {
  return enqueue(async () => {
    const current = await getCoins();
    const next = Math.max(0, current - Math.floor(amount));
    await setCoins(next);
    return next;
  });
}
```

---

## HI-4. `App.js` `loadProfile().then()` missing `.catch`

**Status:** Confirmed from old H4
**Effort:** ~2 minutes
**Risk if ignored:** Unhandled promise warning in dev

### Fix

```javascript
loadProfile()
  .then((profile) => {
    if (profile?.cardTheme) {
      setTheme(profile.cardTheme);
    }
  })
  .catch((err) => {
    console.warn("Failed to load profile theme:", err);
  });
```

---

## HI-5. Network message field shape inconsistencies

**Status:** New finding
**Effort:** ~10 minutes audit
**Risk if ignored:** Inconsistent state shape on client vs host

### The problem

When the host sends `{ type: "GAME_STATE", lastAction: undefined, ... }`, JSON.stringify omits `lastAction`. The client receives a message without that field. If client code spreads `msg` into state, it carries the absence.

This works today because all the falsy checks (`if (lastAction)`) handle the undefined case. But the shapes diverge slowly.

### Fix

Either:
- Always send explicit nulls: `lastAction: state.lastAction ?? null`
- Or add a strict normalizer on the client: `normalizeGameState(msg)`

For v1, leave alone but be aware.

---

## HI-6. `LastCardGameScreen.js` `scheduleTimeout` might not cancel previous

**Status:** New finding
**Effort:** ~5 minutes
**Risk if ignored:** Stacked timers, AI fires twice on rapid state changes

### The problem

Need to verify the implementation of `scheduleTimeout`. If it doesn't clear the existing ref before setting a new one, timers stack up.

### Fix

Make sure the helper looks like this:

```javascript
function scheduleTimeout(ref, fn, ms) {
  if (ref.current) clearTimeout(ref.current);
  ref.current = setTimeout(() => {
    ref.current = null;
    fn();
  }, ms);
}
```

---

## HI-7. WildRound AI effect dependency brittleness

**Status:** New finding
**Effort:** ~5 minutes
**Risk if ignored:** None today; brittle if shape changes

### The problem

```javascript
useEffect(() => {
  ...
}, [gameState?.phase, gameState?.judgeIndex]);
```

If `judgeIndex` ever changes from a primitive to an object, deps break silently.

### Fix

For now, just add a comment. Long-term, prefer to extract to primitives:

```javascript
const aiPhase = gameState?.phase;
const aiJudgeIdx = gameState?.judgeIndex;
useEffect(() => { ... }, [aiPhase, aiJudgeIdx]);
```

---

## HI-8. ✅ Verified correct (no action needed)

`LobbyScreen.aiPlayersRef.current` is updated inside the `setPlayers` updater (synchronous). Pattern is correct.

---

## HI-9. `JoinScreen.js` defensive cleanup

**Status:** New finding
**Effort:** ~2 minutes (cosmetic)

### The problem

```javascript
function cleanup() {
  stopDiscovery();
  clearInterval(staleRef.current);   // null is no-op, but cleaner with guard
  clearTimeout(timeoutRef.current);
  disconnectFromHost();
}
```

`clearInterval(null)` and `clearTimeout(null)` are no-ops, so this isn't a bug. Just cosmetic.

### Fix

```javascript
function cleanup() {
  stopDiscovery();
  if (staleRef.current) clearInterval(staleRef.current);
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  disconnectFromHost();
}
```

---

## HI-10. Solitaire `clearGame` fires redundantly after win

**Status:** New finding
**Effort:** ~5 minutes
**Risk if ignored:** Wasted AsyncStorage writes

### The problem

```javascript
useEffect(() => {
  const key = solitaireSaveKey(...);
  if (state.status === "won") {
    clearGame(key);  // fires on every state change after win
    return;
  }
  saveGame(key, { ... });
}, [state, elapsed]);
```

After winning, every subsequent state change (modal opening, etc.) re-fires `clearGame`.

### Fix

```javascript
const wonClearedRef = useRef(false);

useEffect(() => {
  const key = solitaireSaveKey(state.variantId || routeVariantId);
  if (state.status === "won") {
    if (!wonClearedRef.current) {
      wonClearedRef.current = true;
      clearGame(key);
    }
    return;
  }
  wonClearedRef.current = false;
  saveGame(key, { state: { ...state, history: undefined }, elapsed });
}, [state, elapsed]);
```

---

# 🟡 MEDIUM PRIORITY — Code quality / maintainability

---

## M-1. Extract `useMultiplayerGame` hook

**Status:** Confirmed from old M1
**Effort:** ~3-4 hours
**Risk if ignored:** None — but adding game #9 will be tedious

### The problem

8 multiplayer screens duplicate the same setup: fullRef, applyState, toPublic, setServerListeners, setClientListeners, auto-save, win detection.

### Fix

Create `game/useMultiplayerGame.js`:
```javascript
export function useMultiplayerGame({ gameId, deal, toPublic, isHost, ... }) {
  const [gameState, setGameState] = useState(null);
  const fullRef = useRef(null);

  const applyState = useCallback((next) => { ... }, [...]);

  useEffect(() => { /* mount logic */ }, []);

  return { gameState, applyState, fullRef };
}
```

Refactor each game screen to use it. Test thoroughly — networking is fragile.

---

## M-2. Centralize game registry

**Status:** Confirmed from old S1
**Effort:** ~2 hours

Today, adding a game requires touching: `Lobby GAMES`, `SinglePlayerSetup CAROUSEL`, `HowToPlay GAMES`, `App.js` routes, `tableThemes`, variant picker.

### Fix

Create `game/registry.js`:
```javascript
export const GAMES = [
  {
    id: 'blackjack',
    label: 'Blackjack',
    screen: 'MultiplayerGame',
    singlePlayerScreen: 'BlackjackModePicker',
    minPlayers: 1,
    maxPlayers: 4,
    hasAI: false,
    tableColor: '#35654D',
    accentColor: '#FFD700',
    description: '...',
    rules: { ... },
  },
  // ... etc
];
```

Then every consumer imports `GAMES` and filters/maps.

---

## M-3. Replace remaining `console.log` with `logger.log`

**Status:** Partial — `GameNetwork.js` already uses `log()`, but other files have raw `console.log/warn/error`
**Effort:** ~15 minutes

### Fix

Find all `console.log`, `console.warn`, `console.error` in `screens/` and `game/`. Replace with:
```javascript
import { log, warn } from "../game/logger";

log("...");
warn("...");
```

(For errors, just use `warn` since `__DEV__` gates it.)

---

## M-4. Move LastCard image map to its own file

**Status:** New finding
**Effort:** ~10 minutes

### The problem

`LastCardGameScreen.js` has a 109-image hardcoded `LC` object at the top of the file.

### Fix

Create `game/lastCardImages.js`:
```javascript
export const LC = {
  card_back: require("../assets/card_images_lastcard/card_back.png"),
  od_green_0: require("../assets/card_images_lastcard/od_green_0.png"),
  // ... all 109
};
```

In LastCardGameScreen.js:
```javascript
import { LC } from "../game/lastCardImages";
```

---

## M-5. Split `cardTheme.js` into per-theme files

**Status:** New finding
**Effort:** ~30 minutes

### The problem

`cardTheme.js` is ~470 lines of static requires. Hard to navigate.

### Fix

Create directory `game/themes/`:
```
game/themes/neon.js
game/themes/cowboy.js
game/themes/classic.js
... etc
```

Each file exports its image map. `cardTheme.js` imports them and manages active state.

---

## M-6. `recordWin` race condition

**Status:** New finding
**Effort:** ~10 minutes
**Risk if ignored:** Could undercount wins under concurrent calls

Same pattern as HI-3. Use the same queue.

---

## M-7. LobbyScreen handler closure stale-state risk

**Status:** New finding
**Effort:** ~5 minutes audit

The host effect captures `myName` from closure. If renaming mid-lobby were ever added, broadcasts would use the old name. Currently OK because rename isn't possible mid-lobby.

### Fix

Just add a `myNameRef` that updates if `myName` changes:
```javascript
const myNameRef = useRef(myName);
useEffect(() => { myNameRef.current = myName; }, [myName]);
```

Then use `myNameRef.current` inside the handler closures.

---

## M-8. Centralize magic numbers

**Status:** New finding
**Effort:** ~30 minutes

### The problem

Constants scattered everywhere:
- `MIN_BET = 10`
- `STARTING_BALANCE = 1000`
- `STALE_MS = 6000`
- `STARTING_CHIPS = 500`
- `SMALL_BLIND = 10`
- `BIG_BLIND = 20`
- `BROADCAST_MS = 2000`
- AI delays (`900`, `1200`, `1500`, etc.)

### Fix

Create `game/config.js`:
```javascript
export const WALLET = {
  STARTING_BALANCE: 1000,
  MIN_BET: 10,
  BET_OPTIONS: [10, 25, 50, 100, 250],
};

export const POKER = {
  STARTING_CHIPS: 500,
  SMALL_BLIND: 10,
  BIG_BLIND: 20,
};

export const NETWORK = {
  STALE_MS: 6000,
  BROADCAST_MS: 2000,
  CONNECT_TIMEOUT_MS: 8000,
};

export const AI = {
  POKER_DELAY_MIN: 1000,
  POKER_DELAY_JITTER: 800,
  WILDROUND_SUBMIT_DELAY: 900,
  WILDROUND_JUDGE_DELAY: 1500,
  // ...
};
```

Import everywhere.

---

## M-9. Move multiplayer Blackjack logic to `game/blackjack.js`

**Status:** New finding
**Effort:** ~1 hour

### The problem

`MultiplayerGameScreen.js` has pure functions `dealCards`, `doHit`, `doStand`, `doSplit`, `runDealer` — duplicating logic that exists differently in `GameScreen.js`.

### Fix

Create `game/blackjack.js` with the pure logic. Both screens import and use it.

---

## M-10. (Rolls up with CR-6 — same issue)

Standardize ES modules everywhere. Tracked under CR-6.

---

## M-11. `getDefaultProfile()` returns fresh object every time

**Status:** New finding
**Effort:** ~5 minutes

### The problem

```javascript
export function getDefaultProfile() {
  return { ...DEFAULT_PROFILE, stats: {} };  // new object each call
}
export function getCachedProfile() {
  return cachedProfile || getDefaultProfile();  // fresh default each call
}
```

Components that rely on referential equality for memoization break on the default path.

### Fix

```javascript
let cachedDefault = null;
export function getCachedProfile() {
  if (cachedProfile) return cachedProfile;
  if (!cachedDefault) cachedDefault = { ...DEFAULT_PROFILE, stats: {} };
  return cachedDefault;
}
```

---

# 🟢 LOW PRIORITY — Nitpicks, style, polish

---

## L-1. Add comment to `index.js`
**Effort:** 1 minute
Add: `// Auto-generated by Expo. Don't edit unless you know what you're doing.`

---

## L-2. Audit `package.json` for unused web deps
**Effort:** 5 minutes
Run `npm ls fbjs` and check if it's a direct dep or transitive.
If you're not shipping web, remove: `fbjs`, `react-dom`, `react-native-web`.

---

## L-3. Verify `wildround.js` has no test code at import
**Effort:** 5 minutes
Check `game/wildround.js` — the search results showed test-like assertions. Make sure they're inside a function that's NEVER called at module top level. If there's anything like `runTests()` at the bottom, comment it out or move to `__tests__/wildround.test.js`.

---

## L-4. Resolve Conquian's half-state in RummyVariantPicker
**Status:** Old M3
**Effort:** 15 minutes
Either fully merge Conquián into RummyVariantPicker flow, or remove it from there.

---

## L-5. Remove dead Settings/Results routes
**Status:** Old M6/M7
**Effort:** 10 minutes
Either fill them in or delete them from `App.js` Stack.Navigator.

---

## L-6. Skip — not worth it for v1
StyleSheet memoization is fine.

---

## L-7. Auto-stop UDP broadcast after game starts
**Status:** Old M8
**Effort:** 10 minutes
In `LobbyScreen.handleStartGame`, call `stopBroadcasting()` before navigating away. Already happens on unmount, but better to be explicit.

---

## L-8. Standardize `String(id)` vs raw id comparisons
**Effort:** 15 minutes
Search for `=== clientId`, `=== p.id`, `=== msg.id`. Wrap both sides in `String(...)` consistently.

---

## L-9. ProfileScreen + CardThemeScreen double subscription
**Effort:** Skip — cosmetic only
Both screens subscribe to theme changes. Minor double-update but not a real issue.

---

## L-10. Add `warn` logging to `gameSaves.js` silent catches
**Effort:** 5 minutes
```javascript
import { warn } from "./logger";

export async function saveGame(gameKey, state) {
  try {
    await AsyncStorage.setItem(gameKey, JSON.stringify(state));
  } catch (err) {
    warn("[gameSaves] save failed:", err);
  }
}
```
Apply to `loadGame`, `clearGame`, `hasSave`.

---

## L-11. Verify `lastCard.js` action functions are pure
**Effort:** 5 minutes
Spot-check `applyCard`, `chooseColor`, `drawCard` — make sure they return new state objects, not mutate.
Quick test in dev console: `Object.is(state, applyCard(state, ...))` should be `false`.

---

## L-12. Standardize SafeAreaView / KeyboardAvoidingView usage
**Effort:** 30 minutes
- All top-level screens → `SafeAreaView` from `react-native-safe-area-context`
- Screens with text input → also wrap in `KeyboardAvoidingView` (HostSetup, Join, Profile)
- Audit Lobby (no input, just needs SafeAreaView)

---

# 🚀 IMPROVEMENTS — Nice-to-haves

---

## S-1. `__DEV__` debug overlay
A floating "i" button (dev-only) showing: current player count, free heap, current screen, last AsyncStorage write. Saves debugging time.

## S-2. Jest tests for game logic
One test file per game logic file. Catches regressions on refactors.

## S-3. Remote-loadable card content (old M10)
Fetch wildroundCards.json from a URL, cache in AsyncStorage. Enables OTA content updates.

## S-4. Centralized "round-over" helper
A shared function that handles: record stats, award coins, clear save, set phase to results. Single source of truth.

## S-5. "Quick Match" button on Home
Tap → 2 AI players → Blackjack. Skips picker flow.

## S-6. Dev-mode tools screen
Long-press the version number 5 times → "Dev Tools" screen with: clear all saves, reset wallet, jump to any screen, etc.

## S-7. Schema versioning for saves (old S5)
Add `{ schemaVersion: 1, ... }` to every save. Discard saves with mismatched versions on load.

---

# 🎯 Recommended order to tackle

If you want a suggested path:

### Week 1 — Critical safety
1. CR-1 (circular import) — 15 min
2. HI-2 (wallet error handling) — 5 min
3. HI-3 (wallet atomicity) — 15 min
4. HI-4 (loadProfile catch) — 2 min
5. CR-4 (Solitaire flash) — 10 min
6. HI-6 (scheduleTimeout cancel) — 5 min
7. L-3 (verify wildround tests) — 5 min

**Total: ~1 hour for the highest-value fixes**

### Week 2 — Cleanup & consistency
8. CR-6 (rummy → ES modules) — 30 min
9. CR-3 (LobbyScreen deps) — 10 min
10. HI-10 (Solitaire clearGame redundancy) — 5 min
11. M-3 (console.log → logger) — 15 min
12. L-2 (audit package.json) — 5 min
13. L-10 (gameSaves logging) — 5 min

### Week 3 — Refactors (post-v1.0)
14. M-4 (LastCard images extracted) — 10 min
15. M-1 (useMultiplayerGame hook) — 3-4 hrs
16. M-2 (game registry) — 2 hrs
17. M-8 (config.js) — 30 min
18. M-9 (game/blackjack.js) — 1 hr

### Eventually
19. S-2 (Jest tests)
20. S-7 (schema versioning)
21. Everything else as time allows

---

# 📌 Cross-references

- **COMPREHENSIVE_REVIEW.md** — earlier review doc; many items overlap (noted inline)
- **PROJECT_NOTES.md** — authoritative project state
- **CONQUIAN_SPEC.md / WILDROUND_SPEC.md / LASTCARD_SPEC.md** — game specs

---

# 📝 Session log

Track what you complete here.

### Session 1 — [Date]
- [ ] (none yet — fill in as you go)
- Notes:

### Session 2 — [Date]
- [ ] ...
- Notes:

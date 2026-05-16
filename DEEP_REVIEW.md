# 🔍 Card Night — Deep Code Review v2 (2026-05-16)

> **Fresh sweep** performed after v1 completion. The v1 doc has been archived
> as `DEEP_REVIEW_v1_archive.md`. All items in this doc are new findings
> against the current state of the codebase.
>
> Scope: code quality + UX + performance + accessibility + App Store readiness.

---

## 📋 How to use this file

- Each item has a unique ID (e.g. `BUG-1`, `LAUNCH-1`)
- Check off `- [ ]` → `- [x]` as you complete items
- Items grouped by category, then ordered by priority within each category
- "Beginner-friendly" — each item explains what, why, and the fix

---

## ✅ Progress Tracker

### 🚨 LAUNCH-BLOCKING (must fix before App Store / Google Play submission)

- [x] ~~**LAUNCH-1** — Duplicate Android permissions in app.json~~
- [x] ~~**LAUNCH-2** — Missing iOS camera & microphone permission descriptions~~
- [x] ~~**LAUNCH-3** — App.js uses raw console.warn (not logger)~~
- [x] ~~**LAUNCH-4** — ErrorBoundary uses raw console.error (not logger)~~
- [x] ~~**LAUNCH-5** — Privacy policy URL placeholder still in AboutScreen~~
- [x] ~~**LAUNCH-6** — Sound infrastructure ships unused — DECIDED: keep as-is for v1. Cost is negligible (~4 tiny WAV files), infrastructure ready for future audio. Revisit when real audio is sourced.~~
- [x] ~~**LAUNCH-7** — Duplicate Bonjour service entry in iOS infoPlist~~

### 🐛 BUGS (potential crashes, incorrect behavior)

- [x] ~~**BUG-1** — useResumePrompt button order is dangerous~~
- [ ] **BUG-2** — recordWin has the same race condition as the old HI-3
- [ ] **BUG-3** — getDefaultProfile returns a fresh object on every call
- [ ] **BUG-4** — Solitaire `__RESTORE__` action loses unsaved state if you reload mid-game
- [x] ~~**BUG-5** — UDP broadcast keeps running after game starts~~

### ⚡ PERFORMANCE

- [ ] **PERF-1** — `cardTheme.js` loads 8 themes × 53 images at startup
- [ ] **PERF-2** — LastCard ships 109 images in a single module
- [ ] **PERF-3** — Solitaire auto-save fires on every state field change
- [ ] **PERF-4** — Background sockets keep running until user backs out

### ♿ ACCESSIBILITY (Apple/Google care about this)

- [x] ~~**ACC-1** — partial: lobby/menu/setup screens done. In-game action buttons still pending (becomes ACC-3 future work).~~
- [x] ~~**ACC-2** — Card components have no accessibility info~~
- [ ] **ACC-3** — Many in-game action buttons lack accessibility props
- [ ] **ACC-4** — Color-only state indication (turn highlights, valid melds)
- [ ] **ACC-5** — Text contrast on muted labels (`#666680` on dark)

### 🎨 UX POLISH

- [ ] **UX-1** — "Start New" is labeled `destructive` (red) but is on the right
- [ ] **UX-2** — Profile photo button has no hit feedback
- [ ] **UX-3** — Loading states use hardcoded `#e94560` spinner everywhere
- [ ] **UX-4** — Resume prompt destroys saves with no second confirmation
- [ ] **UX-5** — No "back" handling on Android hardware back button

### 🧹 CODE QUALITY (from v1 that I'm bringing forward)

- [ ] **CQ-1** — Extract useMultiplayerGame hook (was M-1)
- [ ] **CQ-2** — Centralize game registry (was M-2)
- [ ] **CQ-3** — Centralize magic numbers into config.js (was M-8)
- [ ] **CQ-4** — Move multiplayer Blackjack logic to game/blackjack.js (was M-9)
- [ ] **CQ-5** — Extract LastCard image map to its own file (was M-4)
- [ ] **CQ-6** — Split cardTheme.js into per-theme files (was M-5)
- [ ] **CQ-7** — LobbyScreen handler closure stale-state risk (was M-7)
- [ ] **CQ-8** — Standardize String(id) vs raw id comparisons (was L-8)
- [ ] **CQ-9** — Standardize SafeAreaView / KeyboardAvoidingView usage (was L-12)
- [ ] **CQ-10** — Verify lastCard.js action functions are pure (was L-11)
- [ ] **CQ-11** — Resolve Conquian's half-state in RummyVariantPicker (was L-4)
- [ ] **CQ-12** — Network message shape inconsistencies (was HI-5 — deferred)

### 🚀 IMPROVEMENTS (deferrable post-launch)

- [ ] **IMP-1** — `__DEV__` debug overlay
- [ ] **IMP-2** — Jest tests for game logic
- [ ] **IMP-3** — Remote-loadable wildround cards (OTA content updates)
- [ ] **IMP-4** — Centralized round-over helper
- [ ] **IMP-5** — "Quick Match" button on Home
- [ ] **IMP-6** — Dev-mode tools screen
- [ ] **IMP-7** — Schema versioning for saves

---

# 🚨 LAUNCH-BLOCKING

These issues will either get the app rejected by App Store / Google Play review,
or cause silent broken behavior in the production build. Fix all of these
before the next EAS production build.

---

## LAUNCH-1. Duplicate Android permissions in app.json

**Effort:** 2 minutes
**Risk if ignored:** Google Play may flag "redundant permissions"; Android may show extra permission dialogs

### What's happening

Open `app.json` and look at `android.permissions`. Every permission is listed
**twice**:

```json
"permissions": [
  "android.permission.NEARBY_WIFI_DEVICES",
  "android.permission.ACCESS_NETWORK_STATE",
  ...
  "android.permission.NEARBY_WIFI_DEVICES",   // ← duplicate
  "android.permission.ACCESS_NETWORK_STATE",  // ← duplicate
  ...
]
```

This looks like a copy-paste accident. It probably won't reject the build,
but it's noise and could trigger automated lint warnings during review.

### The fix

Deduplicate the list. The correct set is:

```json
"permissions": [
  "android.permission.NEARBY_WIFI_DEVICES",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.ACCESS_WIFI_STATE",
  "android.permission.INTERNET",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS"
]
```

> Wait — do we need RECORD_AUDIO and MODIFY_AUDIO_SETTINGS at all? The app
> has no recording feature and only plays sounds. These were likely added by
> `expo-audio` automatically. **Verify they're actually required.** If you
> don't have voice chat or recording, you can probably remove both. Less is
> better for app store review.

---

## LAUNCH-2. Missing iOS camera & microphone permission descriptions

**Effort:** 5 minutes
**Risk if ignored:** **App Store will reject the build.** This is a hard requirement.

### What's happening

iOS requires every permission your app requests to have a human-readable
description string in `Info.plist`. Without these, your app will crash the
moment it tries to access the camera (or be rejected during review).

Your `app.json` has only `NSLocalNetworkUsageDescription`. But the Android
side declares `CAMERA` and your code (`ProfileScreen.js`) actively requests
camera permission to take a profile photo.

If a reviewer or user taps the avatar → "Take Photo", iOS will look for
`NSCameraUsageDescription` and find nothing. The app crashes.

### Why this matters

Apple specifically tests this during app review. Apps that crash on first
permission request are auto-rejected.

### The fix

Add these keys to `app.json` under `ios.infoPlist`:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.pedro.cardgameapp",
  "infoPlist": {
    "NSLocalNetworkUsageDescription": "Card Night uses your local network to find and connect to games on the same Wi-Fi.",
    "NSCameraUsageDescription": "Card Night uses your camera only when you choose to take a profile photo. Photos are stored on your device.",
    "NSPhotoLibraryUsageDescription": "Card Night uses your photo library only when you choose to pick a profile photo. Photos are stored on your device.",
    "NSBonjourServices": [
      "_cardnight._tcp"
    ]
  }
}
```

> Note: The wording matters. Apple wants concrete, honest descriptions.
> Vague ones like "for app features" get rejected.

---

## LAUNCH-3. App.js uses raw console.warn (not logger)

**Effort:** 1 minute
**Risk if ignored:** Console noise in production builds (no crash)

### What's happening

In `App.js`:

```javascript
.catch((err) => {
  console.warn("Failed to load profile theme:", err);
});
```

You have `game/logger.js` that wraps console calls so they're silenced in
production via `__DEV__`. App.js bypasses this — meaning if the catch
ever fires in production, it logs to the user's device console.

Not user-visible, but inconsistent with the rest of the codebase.

### The fix

```javascript
import { warn } from "./game/logger";

// ...
.catch((err) => {
  warn("Failed to load profile theme:", err);
});
```

---

## LAUNCH-4. ErrorBoundary uses raw console.error

**Effort:** 1 minute
**Risk if ignored:** Production users' crash logs go to device console (noise, but technically fine)

### What's happening

`components/ErrorBoundary.js`:

```javascript
componentDidCatch(error, info) {
  console.error("[ErrorBoundary] Uncaught error:", error);
  console.error("[ErrorBoundary] Component stack:", info.componentStack);
}
```

Same as LAUNCH-3 — bypasses the logger.

### Why this is borderline

ErrorBoundary actually has a _defensible_ reason to use raw console.error:
crashes are exactly the moments you want logs to surface. **If you ever
add a crash-reporting service (Sentry, Bugsnag), this is where it goes.**

For now, switch to `warn` from the logger to be consistent. When you add
crash reporting later, swap this for `Sentry.captureException(error)` or
similar.

### The fix

```javascript
import { warn } from "../game/logger";

componentDidCatch(error, info) {
  warn("[ErrorBoundary] Uncaught error:", error);
  warn("[ErrorBoundary] Component stack:", info.componentStack);
}
```

---

## LAUNCH-5. Privacy policy URL placeholder still in AboutScreen

**Effort:** Depends on hosting — 5 min to update once URL exists
**Risk if ignored:** App Store will reject; users tapping "Privacy Policy" will see a broken link

### What's happening

`AboutScreen.js` has a `PRIVACY_POLICY_URL` constant that the "Privacy Policy"
button opens. The actual policy text isn't visible to me from the snippets,
but `APP_STORE_REVIEW_NOTES.md` explicitly contains:

```
Privacy policy: [INSERT YOUR PRIVACY POLICY URL HERE]
```

This means the URL is unset. Apple **requires** a working privacy policy URL
in App Store Connect AND a link from inside the app. Both Apple and Google
will reject a submission with `localhost`, `example.com`, or a 404.

### Why this matters

This isn't optional. Even "no data is collected" apps need a privacy policy
explicitly stating that. Plenty of templates exist (privacypolicies.com,
GitHub Pages, etc.).

### The fix (when you're ready)

1. Write a short privacy policy:

   > Card Night does not collect, store, or transmit any personal data to
   > any server. All gameplay, profile data, photos, and statistics are
   > stored only on your device. The app uses your local Wi-Fi network
   > only for direct device-to-device multiplayer. No third-party
   > analytics, ads, or tracking is used.

2. Host it somewhere stable:
   - GitHub Pages on your repo (free, easy)
   - A simple HTML file on any web host
   - Notion, Google Sites, etc.

3. Update `AboutScreen.js`:

   ```javascript
   const PRIVACY_POLICY_URL =
     "https://hardrockpdc.github.io/card-game-app/privacy.html";
   ```

4. Also update `APP_STORE_REVIEW_NOTES.md` for the App Store Connect form.

---

## LAUNCH-6. Sound infrastructure ships unused (placeholder WAVs in bundle)

**Effort:** 5 minutes
**Risk if ignored:** Adds wasted MB to your install size; technically a non-issue but worth cleaning

### What's happening

Per `PROJECT_NOTES.md`:

> "silent WAV placeholders in `assets/sounds/` — replace with real audio files"
> "Sound menu item removed from all 9 game screens"

So `initSounds()` still runs at startup, loading 4 silent WAVs that no
game ever plays. The user-facing toggle is gone, but the infrastructure
remains.

### Decision needed

You have three options:

**A. Keep as-is** (current state) — infrastructure ready for future audio.
Costs: ~4 small WAV files (probably negligible).

**B. Strip it out for v1.0** — remove the `initSounds()` call, delete the
WAV files, remove `expo-audio` from `package.json`. Add it back when you
have real audio. Costs nothing now; some work to reintegrate later.

**C. Source real audio before launch** — find CC0 card sounds, drop them
in, re-add the sound toggle to the game menus.

> My recommendation: **A for v1.0**. The cost is tiny, the infrastructure
> is ready, and removing/re-adding the dependency is annoying. Don't optimize
> what isn't a problem.

### The fix (only if you pick B)

Remove `initSounds()` call from App.js, delete `assets/sounds/*.wav`, delete
`game/sounds.js`, remove `expo-audio` from `package.json`, remove
`RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` from Android permissions, remove
`"expo-audio"` from the `plugins` array in app.json.

---

## LAUNCH-7. Duplicate Bonjour service entry in iOS infoPlist

**Effort:** 30 seconds
**Risk if ignored:** Cosmetic; no functional impact

### What's happening

`app.json`:

```json
"NSBonjourServices": [
  "_cardnight._tcp",
  "_cardnight._tcp"   // ← duplicate
]
```

The same service is listed twice. iOS won't crash but the duplicate is
unnecessary.

### The fix

```json
"NSBonjourServices": [
  "_cardnight._tcp"
]
```

---

# 🐛 BUGS

Potential crashes or incorrect behavior. Not as urgent as LAUNCH items but
should be fixed before users see them.

---

## BUG-1. useResumePrompt button order is dangerous

**Effort:** 2 minutes
**Risk if ignored:** Players will accidentally destroy saved games

### What's happening

`game/useResumePrompt.js`:

```javascript
Alert.alert("Game in Progress", body, [
  {
    text: "Start New",
    style: "destructive",
    onPress: async () => {
      await clearGame(saveKey);
      onFresh();
    },
  },
  { text: "Continue", onPress: onResume },
]);
```

On iOS, the `destructive` button (red) appears on the **left** in iOS alerts,
and "Continue" appears on the right. The natural user assumption is "the
positive action is on the right." Most users will:

1. See "Start New" (red, scary) on the left
2. See "Continue" (blue, default) on the right
3. Tap "Continue" expecting to continue ✅

But on Android, iOS, or different OS versions, button order is platform-dependent.
And worse: there's **no second confirmation**. One accidental tap on "Start New"
and the saved game is gone forever.

Combined with UX-4 (no double confirmation), this is a recipe for support tickets
along the lines of "I lost my poker tournament progress and I didn't even press
anything."

### Why this matters

Save destruction is irreversible. Industry standard is to require either:

- A second confirmation step ("Are you sure? This can't be undone")
- A clearly-labeled "Cancel" option that's the default

### The fix

Add a Cancel option, and reword to make the destructive intent explicit:

```javascript
Alert.alert(
  "Game in Progress",
  body,
  [
    { text: "Cancel", style: "cancel" },
    { text: "Continue Saved", onPress: onResume },
    {
      text: "Start New (Erase Save)",
      style: "destructive",
      onPress: async () => {
        await clearGame(saveKey);
        onFresh();
      },
    },
  ],
  { cancelable: true },
);
```

Now tapping anywhere outside the alert closes it harmlessly, "Continue Saved"
is unambiguous, and "Start New (Erase Save)" makes the consequence explicit.

---

## BUG-2. recordWin has the same race condition as the old HI-3

**Effort:** 10 minutes
**Risk if ignored:** Could undercount wins if two coin awards fire near-simultaneously

### What's happening

`game/profile.js`:

```javascript
export async function recordWin(gameId) {
  const profile = await loadProfile();
  const stats = { ...profile.stats };
  const entry = stats[gameId] || { wins: 0 };
  stats[gameId] = { wins: entry.wins + 1 };
  await saveProfile({ ...profile, stats });
}
```

This is the exact same pattern that HI-3 fixed for wallet operations. Two
near-simultaneous `recordWin` calls (e.g. multiplayer + AI both winning, or
edge timing during state restoration) could both read `wins: 5`, both
write `wins: 6`, and you lose a win.

### Why this matters less than HI-3

Wallet was a more serious concern (real coins, more frequent operations).
Wins are recorded only at game-end and the timing collision is rare.
**But** it's a bug we know exists, and the fix is identical to one we
already have.

### The fix

Add the same kind of queue from `wallet.js`:

```javascript
// At top of profile.js
let profileQueue = Promise.resolve();
function enqueue(fn) {
  profileQueue = profileQueue.then(fn, fn);
  return profileQueue;
}

export async function recordWin(gameId) {
  return enqueue(async () => {
    const profile = await loadProfile();
    const stats = { ...profile.stats };
    const entry = stats[gameId] || { wins: 0 };
    stats[gameId] = { wins: entry.wins + 1 };
    await saveProfile({ ...profile, stats });
  });
}
```

> Optional: wrap `updateProfile` and `saveProfile` in the same queue. Then
> all profile writes are serialized. Cheap insurance.

---

## BUG-3. getDefaultProfile returns a fresh object on every call

**Effort:** 5 minutes
**Risk if ignored:** Subtle bug where components that rely on referential equality re-render unnecessarily; minor perf hit

### What's happening

`game/profile.js` (this is the v1 review's M-11, still open):

```javascript
export function getDefaultProfile() {
  return { ...DEFAULT_PROFILE, stats: {} }; // new object each call
}
```

Every call returns a brand-new object. Components that use this as fallback
and then check `prevProfile === currentProfile` for memoization will always
see "different" and re-render even though the data didn't change.

### Why this matters

It's a small perf cost. More importantly, it's a footgun: any future
optimization that assumes referential stability will silently break.

### The fix

Cache the default once:

```javascript
let cachedDefault = null;

export function getDefaultProfile() {
  if (!cachedDefault) cachedDefault = { ...DEFAULT_PROFILE, stats: {} };
  return cachedDefault;
}

export function getCachedProfile() {
  return cachedProfile || getDefaultProfile();
}
```

> Caveat: callers should NOT mutate the returned object. They should
> already be doing `{ ...profile, name: "new" }` and not `profile.name = "new"`.
> Worth a quick search for any mutation to be safe.

---

## BUG-4. Solitaire **RESTORE** loses unsaved state if you reload mid-game

**Effort:** 15 minutes
**Risk if ignored:** Rare scenario; only affects players who hot-reload during a game

### What's happening

`screens/SolitaireGameScreen.js` has two mount effects:

1. **Effect A** — fires first, dispatches `newGameAction` UNLESS resumeFromSave
2. **Effect B** — fires second, loads saved state if resumeFromSave

In the normal flow this is fine. But during dev/hot-reload, the
component re-mounts with `resumeFromSave: undefined`. Effect A then
clobbers the in-memory state with a fresh deal. The saved state on disk
is intact, but the live game is gone.

### Why this matters

Only really hits during dev with hot-reload. Production users won't hit
this since the app doesn't remount mid-game.

### The fix

Check if a save exists, regardless of `resumeFromSave`:

```javascript
useEffect(() => {
  async function init() {
    const saved = await loadGame(solitaireSaveKey(routeVariantId));
    if (saved?.state) {
      dispatch({ type: "__RESTORE__", payload: saved.state });
      if (typeof saved.elapsed === "number") setElapsed(saved.elapsed);
      return;
    }
    initialGameDispatched.current = true;
    dispatch(newGameAction(routeVariantId, { spiderMode: routeSpiderMode }));
    coinRewardedRef.current = false;
    setCoinsEarned(0);
    setElapsed(0);
  }
  init();
}, [routeVariantId, routeSpiderMode]);
```

Then delete the separate restore effect. One unified mount effect.

> Worth thinking about: would this change apply to the other game screens
> too? Probably. The current pattern of "two effects racing" is fragile.
> But for v1 with no known production complaint, just fix Solitaire and
> leave the rest.

---

## BUG-5. UDP broadcast keeps running after game starts

**Effort:** 5 minutes
**Risk if ignored:** Waste of battery / network on host's phone; phantom games visible to other users on the network

### What's happening

`LobbyScreen.js` starts UDP broadcast when the host enters the lobby. When
the host taps "Start Game", the lobby navigates away — but the broadcast
keeps running until the lobby's `useEffect` cleanup fires (which happens
when the lobby unmounts, which doesn't happen during the active game).

Practical effect: another phone scanning for games sees a "Pedro's game"
entry that's no longer actually accepting joins, leading to a confusing
"Connection failed" if they try to join.

### Why this matters

Minor for v1 since lobby-to-game is usually fast and the host's game IS
joinable mid-game (the host is still on the network). But it's wasted
work, drains battery, and confuses users.

### The fix

In `LobbyScreen.handleStartGame`, call `stopBroadcasting()` before
navigating:

```javascript
function handleStartGame() {
  // ... existing validation ...

  stopBroadcasting(); // ← ADD THIS
  broadcastToClients({ type: "START_GAME" /* ... */ });
  navigation.replace(game.screen /* ... */);
}
```

The lobby's existing cleanup will no-op since the broadcast is already stopped.

---

# ⚡ PERFORMANCE

Real performance issues, not micro-optimizations. Each one has a concrete
user-visible cost.

---

## PERF-1. cardTheme.js loads 8 themes × 53 images at startup

**Effort:** 30-60 minutes (overlaps with CQ-6)
**Risk if ignored:** Slower app launch, ~50MB+ peak memory on low-end Android

### What's happening

Even before you've picked a theme, `cardTheme.js` declares require()
statements for **every** image of **every** theme:

```javascript
const NEON = { a_spades: require("...") /* 53 images */ };
const COWBOY = {
  /* 53 images */
};
const GIRLY = {
  /* 53 images */
};
// ... 8 themes × 53 images = 424 require() calls
```

React Native resolves all these at module-load time. The actual pixel data
isn't decoded until used, but each require call still creates an asset
descriptor in memory.

You ran a `compress-cards.js` script that brought this down significantly
(200×280 indexed-color PNGs), so the situation is better than it was. But
424 image references is still a lot to evaluate at startup.

### Why this matters

On low-end Android (Pedro's likely audience), every extra startup ms is
noticeable. Apps that take >3s to launch get bad reviews.

### The fix

Two options, in order of impact:

**Quick win:** Use dynamic lookup with a function:

```javascript
function loadTheme(key) {
  switch (key) {
    case "neon":
      return require("./themes/neon").default;
    case "cowboy":
      return require("./themes/cowboy").default;
    // ...
  }
}
```

Combined with CQ-6 (per-theme files), this means only the active theme
is fully loaded into the require graph initially. Other themes get loaded
on first use.

**Bigger win (post-v1):** Lazy-load with `import()`:

```javascript
async function loadTheme(key) {
  const mod = await import(`./themes/${key}`);
  return mod.default;
}
```

Then `cardTheme.js` becomes an `await`-based loader. More plumbing but
genuinely defers theme loading until the user selects one.

> For v1, just go with the dynamic switch.

---

## PERF-2. LastCard ships 109 images in a single module

**Effort:** 15 minutes (overlaps with CQ-5)
**Risk if ignored:** Slow LastCard screen mount, ~7MB images held in memory while LastCard is open

### What's happening

`screens/LastCardGameScreen.js` opens with a massive object:

```javascript
const LC = {
  card_back: require("../assets/card_images_lastcard/card_back.png"),
  od_green_0: require("../assets/card_images_lastcard/od_green_0.png"),
  // ... 109 entries
};
```

This is loaded into memory as soon as the screen mounts. Same problem as
PERF-1 but localized to LastCard.

### Why this matters

LastCard already feels heavier than other games on slow phones. Pre-loading
all images doesn't help — only the ~7 cards a player holds at a time are
visible.

### The fix

Move the map to its own file (this is CQ-5):

```javascript
// game/lastCardImages.js
export const LC = {
  /* all 109 */
};
```

This doesn't fix the memory cost, just hides it. The real fix is to
lazy-resolve on access:

```javascript
// In LastCardGameScreen.js
function getImage(key) {
  return LC[key];
}
```

If you want a real fix: convert to a card sprite sheet or use a dynamic
resolver. But for v1 the cost is bearable — just extract the file.

---

## PERF-3. Solitaire auto-save fires on every state field change

**Effort:** 10 minutes
**Risk if ignored:** AsyncStorage writes on every move (battery cost, slight lag on slow phones)

### What's happening

`SolitaireGameScreen.js`:

```javascript
useEffect(() => {
  // ...
  saveGame(key, { state: { ...state, history: undefined }, elapsed });
}, [state, elapsed]);
```

This fires on **every** state and elapsed change. `elapsed` updates every
second via the timer interval. So you're hitting AsyncStorage every second.

### Why this matters

AsyncStorage writes aren't instant. On low-end Android, each write can
take 5-20ms. Doing this every second drains battery and can stutter
animations.

### The fix

Throttle the save to once every few seconds, or skip saving when only
`elapsed` changed. Simplest:

```javascript
const lastSaveRef = useRef(0);

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
  // Only save at most once every 3 seconds
  const now = Date.now();
  if (now - lastSaveRef.current < 3000) return;
  lastSaveRef.current = now;
  saveGame(key, { state: { ...state, history: undefined }, elapsed });
}, [state, elapsed]);
```

Add a final save on unmount or when navigating away (handleSaveAndExit
already does this).

> Caveat: with throttling, if the user force-quits in the middle of a save
> window, they lose up to 3 seconds. For a solitaire move that's not
> meaningful. The existing handleSaveAndExit covers the deliberate-exit case.

---

## PERF-4. Background sockets keep running until user backs out

**Effort:** 5 minutes (partial — already handled in App.js)
**Risk if ignored:** Battery drain if user gets a phone call mid-game then loses interest

### What's happening

`App.js` already has:

```javascript
useEffect(() => {
  const sub = AppState.addEventListener("change", (nextState) => {
    if (nextState === "background") {
      stopServer();
      stopBroadcasting();
      stopDiscovery();
    }
  });
  return () => sub.remove();
}, []);
```

Good. But the client TCP socket (the one a non-host uses to talk to the
host) is **not** stopped on background.

### Why this matters

If a non-host player backgrounds the app during multiplayer, the host
never sees them as "left" (because TCP keeps the connection alive in the
OS). The disconnect detection only fires when the OS kills the socket,
which can take 30+ seconds. The host's UI shows the player as still in
the game.

### The fix

In `App.js`:

```javascript
import {
  stopServer,
  stopBroadcasting,
  stopDiscovery,
  disconnectFromHost,
} from "./game/GameNetwork";

useEffect(() => {
  const sub = AppState.addEventListener("change", (nextState) => {
    if (nextState === "background") {
      stopServer();
      stopBroadcasting();
      stopDiscovery();
      disconnectFromHost(); // ← ADD THIS
    }
  });
  return () => sub.remove();
}, []);
```

> Caveat: this is correct for "user navigated away from app" but feels
> harsh if they just briefly check a notification. For v1 we accept it.
> Post-v1, consider a grace period (15s) before disconnecting on background.

---

# ♿ ACCESSIBILITY

Apple's App Store has accessibility audits. Google Play awards higher visibility
to accessible apps. More importantly: screen reader users want to play your game.

---

## ACC-1. HomeScreen buttons lack accessibilityLabel/Role

**Effort:** 10 minutes
**Risk if ignored:** Screen readers announce only "button"; users don't know what each button does

### What's happening

`HomeScreen.js`:

```javascript
<TouchableOpacity onPress={goToSinglePlayer}>
  <Text>Single Player</Text>
</TouchableOpacity>
```

No `accessibilityRole` and no `accessibilityLabel`. The button works for
sighted users but a VoiceOver / TalkBack user just hears "button" with no
context for the inner text.

This pattern is throughout the app — HomeScreen, ProfileScreen, JoinScreen,
HostSetupScreen, every game screen action button.

### Why this matters

iOS App Store actively pulls apps in for accessibility audits. Add
`accessibilityRole="button"` everywhere; VoiceOver / TalkBack will then
announce the button's text content as the label. Five minutes of work
massively widens your audience.

### The fix

For every interactive Text-only button, add:

```javascript
<TouchableOpacity onPress={goToSinglePlayer} accessibilityRole="button">
  <Text>Single Player</Text>
</TouchableOpacity>
```

For non-text buttons (icons, images), also add an explicit label:

```javascript
<TouchableOpacity
  onPress={handleClose}
  accessibilityRole="button"
  accessibilityLabel="Close menu"
>
  <Text>✕</Text>
</TouchableOpacity>
```

Some screens (GameHeader, GameSetup, RummyVariantPicker, PokerVariantPicker,
HostSetup) already do this correctly. Use those as templates.

---

## ACC-2. Card components have no accessibility info

**Effort:** 15 minutes
**Risk if ignored:** Visually impaired players can't identify cards

### What's happening

`components/Card.js` (presumed — based on usage patterns) shows a card
visually with rank + suit but doesn't expose that to screen readers. A
VoiceOver user swiping over cards just hears "image" or nothing.

### Why this matters

Without card-reading, screen reader users can't play. This is a real barrier.

### The fix

In `Card.js`, add an accessibilityLabel that reads the card aloud:

```javascript
<View
  accessible={true}
  accessibilityRole="image"
  accessibilityLabel={faceDown ? "Face down card" : `${rank} of ${suit}`}
>
  {/* existing image */}
</View>
```

For interactive cards (tappable in your hand), make them buttons:

```javascript
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`${rank} of ${suit}, tap to play`}
  // ...
>
```

> Bonus accessibility win: tappable cards should have `accessibilityHint`
> for what tapping does: `"Plays this card to the discard pile"`.

---

## ACC-3. Many in-game action buttons lack accessibility props

**Effort:** 30 minutes spread across game screens
**Risk if ignored:** Screen reader users can't navigate game actions

### What's happening

`MultiplayerGameScreen.js`:

```javascript
<TouchableOpacity onPress={() => handleAction("hit")}>
  <Text style={styles.actionBtnText}>Hit</Text>
</TouchableOpacity>
```

Same as ACC-1 but inside games. Hit / Stand / Split / Draw / Pass / Skip
buttons are all unmarked.

### The fix

Same pattern as ACC-1:

```javascript
<TouchableOpacity
  onPress={() => handleAction("hit")}
  accessibilityRole="button"
  accessibilityLabel="Hit"
  accessibilityHint="Take another card"
>
  <Text style={styles.actionBtnText}>Hit</Text>
</TouchableOpacity>
```

> This is a sweep through every game screen. ~10 minutes per screen × 7
> screens = ~70 minutes. Probably worth batching as a separate session.

---

## ACC-4. Color-only state indication

**Effort:** 30 minutes
**Risk if ignored:** Colorblind players can't tell whose turn it is, valid vs invalid melds, etc.

### What's happening

You use color to signal state in many places:

- Green border on active turn → invisible to red-green colorblind
- Red border on invalid meld → same
- Gold border on player's active hand
- Color coding in result text ("win" = green, "lose" = red)

### Why this matters

About 8% of men have some form of colorblindness. They simply won't see
"the green border means it's your turn."

### The fix

Add a non-color secondary indicator everywhere color signals state:

```javascript
{
  isCurrent && <Text>▶</Text>;
} // Already do this in some places
{
  result === "win" && <Text>✓ Win</Text>;
}
{
  result === "lose" && <Text>✗ Lose</Text>;
}
{
  result === "push" && <Text>= Tie</Text>;
}
```

For borders, add a thicker stroke + symbol:

```jsx
<View style={[styles.handRow, isCurrent && styles.activeHandBorder]}>
  {isCurrent && <Text style={styles.turnIndicator}>▶ Your turn</Text>}
  {/* cards */}
</View>
```

> This is judgment-call-heavy. Worth doing for the obvious cases (turn
> indicator, result colors) and skipping the cosmetic ones (gold border
> on active hand is fine because the text changes too).

---

## ACC-5. Text contrast on muted labels

**Effort:** 15 minutes
**Risk if ignored:** Hard to read on low-brightness phones; potential App Store accessibility flag

### What's happening

Throughout the app, secondary text uses very low-contrast colors:

- `#b0b0c0` on `#1a1a2e` (HomeScreen subtitle)
- `#666680` on `#1a1a2e` (ProfileScreen photoHint, moreRowArrow)
- `#95a2b6` on `#141c28` (EndOfRoundModal message)

WCAG AA requires 4.5:1 contrast ratio for body text. `#666680` on `#1a1a2e`
is approximately 3.1:1 — below the threshold.

### Why this matters

Beyond accessibility scores, sunlight on a phone screen is brutal on low
contrast. Users squint at your app, then put it down.

### The fix

Brighten muted text slightly:

- `#b0b0c0` → `#c4c4d4` (safer secondary)
- `#666680` → `#9090a8` (more readable hint)
- `#95a2b6` → `#a8b5c8` (modal message)

> Don't go too bright — you'll lose the visual hierarchy. The goal is
> "muted but readable." Test on actual phone in daylight.

---

# 🎨 UX POLISH

Smaller user experience issues. None are blocking, but each makes the app
feel more polished.

---

## UX-1. "Start New" is destructive but on the left of resume prompt

(Covered in BUG-1 — same item, listed here for visibility.)

---

## UX-2. Profile photo button has no hit feedback

**Effort:** 5 minutes
**Risk if ignored:** Users tap and aren't sure if it registered

### What's happening

`ProfileScreen.js`:

```javascript
<TouchableOpacity
  style={styles.photoButton}
  onPress={handlePhotoPress}
>
```

Uses `TouchableOpacity` (which dims on tap) but no scale or visual response
to confirm the tap. Most other tappable elements in the app use Pressable
with a `pressed && styles.x` pattern.

### The fix

Convert to Pressable for consistency:

```javascript
<Pressable
  onPress={handlePhotoPress}
  style={({ pressed }) => [
    styles.photoButton,
    pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
  ]}
  accessibilityRole="button"
  accessibilityLabel="Change profile photo"
>
```

---

## UX-3. Loading states use hardcoded #e94560 spinner everywhere

**Effort:** 5 minutes
**Risk if ignored:** Looks dated; doesn't match the new visual standardization work

### What's happening

`JoinScreen.js`, `ProfileScreen.js`, etc. all use:

```javascript
<ActivityIndicator color="#e94560" size="large" />
```

The `#e94560` red is from the early design. The new design system uses
`#7fb3ff` (blue) as the primary accent. The red spinner clashes with the
blue buttons everywhere.

### The fix

Create a constant:

```javascript
// game/colors.js (or wherever)
export const ACCENT_PRIMARY = "#7fb3ff";
```

Replace `color="#e94560"` with `color={ACCENT_PRIMARY}` in spinners.

> Or just hardcode `#7fb3ff` in each spot if you don't want a colors file.
> The standardization is what matters.

---

## UX-4. Resume prompt destroys saves with no second confirmation

(Covered in BUG-1.)

---

## UX-5. No "back" handling on Android hardware back button

**Effort:** 30 minutes
**Risk if ignored:** Android users get unexpected behavior pressing system back

### What's happening

Android phones have a hardware back button (or gesture). By default, React
Navigation handles it as "pop the current screen." This is correct most of
the time, but in a few places it causes issues:

- **Mid-game on a multiplayer screen** → silently disconnects without confirmation
- **In the lobby** → also no confirmation; clients may not realize they've left
- **On the wallet reset confirmation** → back dismisses, which is correct

### Why this matters

iOS doesn't have this concern (no hardware back). Android testers will
report it as "weird."

### The fix

Use `BackHandler` to add confirmation on game screens:

```javascript
import { BackHandler, Alert } from "react-native";

useEffect(() => {
  const onBack = () => {
    Alert.alert("Leave game?", "Your progress will be lost.", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => navigation.navigate("Home"),
      },
    ]);
    return true; // prevent default
  };
  const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
  return () => sub.remove();
}, [navigation]);
```

> Apply to multiplayer screens and the lobby. Single-player game screens
> can default to "save state, then leave" using the existing handleSaveAndExit.

---

# 🧹 CODE QUALITY (from v1, deferred)

These were Medium / Low items from the v1 review that didn't get done. They're
not blocking and can wait until post-launch.

---

## CQ-1. Extract useMultiplayerGame hook

**Effort:** 3-4 hours
**Was:** v1 M-1

8 multiplayer screens duplicate the same setup. Worth extracting before
adding a ninth game. Skip for v1 launch.

---

## CQ-2. Centralize game registry

**Effort:** 2 hours
**Was:** v1 M-2

Today, adding a game requires touching 6 files. Worth centralizing before
the next game. Skip for v1.

---

## CQ-3. Centralize magic numbers into config.js

**Effort:** 30 minutes
**Was:** v1 M-8

Wallet starting balance, blinds, AI delays, network timeouts — all
hardcoded across the codebase. Optional polish.

---

## CQ-4. Move multiplayer Blackjack logic to game/blackjack.js

**Effort:** 1 hour
**Was:** v1 M-9

Pure functions (`dealCards`, `doHit`, `doStand`, `doSplit`, `runDealer`)
live in `MultiplayerGameScreen.js`. Should be in a separate game logic
file. Skip for v1.

---

## CQ-5. Move LastCard image map to its own file

**Effort:** 10 minutes
**Was:** v1 M-4

Pure mechanical extraction. Worth doing soon — see PERF-2.

---

## CQ-6. Split cardTheme.js into per-theme files

**Effort:** 30 minutes
**Was:** v1 M-5

See PERF-1 — combined fix.

---

## CQ-7. LobbyScreen handler closure stale-state risk

**Effort:** 5 minutes
**Was:** v1 M-7

Add a `myNameRef` so server-listener closures see the latest name. Mostly
defensive; no known bug today.

---

## CQ-8. Standardize String(id) vs raw id comparisons

**Effort:** 15 minutes
**Was:** v1 L-8

Search for `=== clientId`, `=== p.id`, etc. Wrap both sides in `String(...)`
consistently. Defensive coding.

---

## CQ-9. Standardize SafeAreaView / KeyboardAvoidingView usage

**Effort:** 30 minutes
**Was:** v1 L-12

All top-level screens → `SafeAreaView` from `react-native-safe-area-context`.
Screens with text input → also wrap in `KeyboardAvoidingView`.

---

## CQ-10. Verify lastCard.js action functions are pure

**Effort:** 5 minutes
**Was:** v1 L-11

Spot-check `applyCard`, `chooseColor`, `drawCard` — confirm they return
new state objects, not mutate. Verification only.

---

## CQ-11. Resolve Conquian's half-state in RummyVariantPicker

**Effort:** 15 minutes
**Was:** v1 L-4

Either fully merge Conquián into RummyVariantPicker, or remove it from
there. Currently it's half-wired-in.

---

## CQ-12. Network message shape inconsistencies

**Effort:** 10 minutes audit
**Was:** v1 HI-5 (explicitly deferred there)

`JSON.stringify({ foo: undefined })` drops `foo`. Client and host can
slowly diverge. Add explicit nulls or a normalizer. Defer to v1.1.

---

# 🚀 IMPROVEMENTS (post-v1)

Nice-to-haves. Don't block launch.

---

## IMP-1. `__DEV__` debug overlay

A floating "i" button (dev-only) showing: current player count, free heap,
current screen, last AsyncStorage write. Saves debugging time.

## IMP-2. Jest tests for game logic

One test file per game logic file. Catches regressions on refactors.

## IMP-3. Remote-loadable wildround cards

Fetch wildroundCards.json from a URL, cache in AsyncStorage. Enables OTA
content updates.

## IMP-4. Centralized "round-over" helper

A shared function that handles: record stats, award coins, clear save,
set phase to results. Single source of truth.

## IMP-5. "Quick Match" button on Home

Tap → 2 AI players → Blackjack. Skips picker flow.

## IMP-6. Dev-mode tools screen

Long-press the version number 5 times → "Dev Tools" with: clear all saves,
reset wallet, jump to any screen.

## IMP-7. Schema versioning for saves

Add `{ schemaVersion: 1, ... }` to every save. Discard saves with
mismatched versions on load.

---

# 🎯 Recommended order

If you want a suggested path:

### Pre-launch (must do before submitting)

1. LAUNCH-2 (iOS permission descriptions) — 5 min
2. LAUNCH-1 (duplicate Android perms) — 2 min
3. LAUNCH-7 (duplicate Bonjour service) — 30 sec
4. LAUNCH-5 (privacy policy URL — when ready) — 5 min
5. LAUNCH-3 + LAUNCH-4 (logger consistency) — 2 min
6. BUG-1 (dangerous resume button order) — 2 min
7. ACC-1 + ACC-2 + ACC-3 (accessibility sweep) — 60 min
8. BUG-5 (UDP broadcast stop) — 5 min

**Total: ~90 minutes for launch readiness**

### Polish (nice to have before launch, OK after)

9. PERF-3 (Solitaire save throttle) — 10 min
10. PERF-4 (background socket cleanup) — 5 min
11. UX-3 (spinner color standardization) — 5 min
12. UX-5 (Android back button on game screens) — 30 min
13. ACC-5 (text contrast) — 15 min
14. BUG-2 (recordWin race) — 10 min
15. BUG-3 (getDefaultProfile caching) — 5 min

### Post-launch (v1.1)

16. PERF-1 + PERF-2 + CQ-5 + CQ-6 (image / theme loading) — 60 min
17. ACC-4 (color-only state) — 30 min
18. CQ-1 (useMultiplayerGame hook) — 3-4 hrs
19. CQ-2 (game registry) — 2 hrs

### Eventually

20. Everything else as time allows
21. IMP-2 (Jest tests) — long-term investment

---

# 📌 Cross-references

- **DEEP_REVIEW_v1_archive.md** — completed v1 review, archived for reference
- **PROJECT_NOTES.md** — authoritative project state
- **APP_STORE_REVIEW_NOTES.md** — paste-ready review notes for submission
- **CONQUIAN_SPEC.md / WILDROUND_SPEC.md / LASTCARD_SPEC.md** — game specs

---

# 📝 Session log

Track what you complete here.

### Session 1 — 2026-05-16

- v1 review completed (CR-1 through CR-6, all High items except HI-5, M-10, L-1, L-2, L-3, L-5, L-6, L-10)
- v2 review created (this doc)
- Next: tackle Pre-launch items 1-8

### Session 2 — [Date]

- [ ] ...
- Notes:

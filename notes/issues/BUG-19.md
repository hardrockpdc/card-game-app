---
id: BUG-19
type: bug
area: ui
status: fixed
severity: low
opened: 2026-09-08
verified: 2026-09-08
evidence: "HomeScreen.js:134-138 goToProfile passed welcomeMessage unconditionally, while goToSinglePlayer at :119-124 gates the identical payload behind if (!profileHasName). Observed on emulator-5554 2026-09-08: opening Profile & Shop as TestBot, a profile with a saved name, showed 'Welcome! Set up your profile (you can change anything later)'. Now gated on profileHasName; device-verified the subtitle is absent for a named profile"
---

## Problem

**BUG-19. Returning players were greeted as first-timers every time they opened Profile.**

`HomeScreen` has two routes into the Profile screen and they disagreed:

```js
function goToSinglePlayer() {
  if (!profileHasName) {                                  // guarded
    navigation.navigate("Profile", { welcomeMessage: … });

function goToProfile() {
  navigation.navigate("Profile", {
    welcomeMessage: PROFILE_WELCOME_MESSAGE,              // unguarded
  });
```

The first is right: the first-run greeting is only for someone who has not set a name.
The second sent it every time, so tapping **Profile & Shop** as an established player
told them to "set up your profile" on a screen already showing their name.

The disagreement between two functions in the same file, one guarded and one not, is what
makes this clearly unintended rather than a deliberate copy choice.

## Verified/Fixed 2026-09-08

`goToProfile` now passes `profileHasName ? undefined : PROFILE_WELCOME_MESSAGE`, matching
its sibling. Device-verified: the subtitle no longer appears for a profile with a name,
and the first-run path is untouched.

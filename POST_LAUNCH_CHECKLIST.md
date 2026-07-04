# Post-Launch Checklist

Status as of first submission: **v8 (versionCode 8) submitted to Closed testing
(Alpha) — "In review"** on 2026-07-01. Google reviews first submissions in ~1–3
days (sometimes hours, sometimes up to a week).

---

## When the review is APPROVED — verify on the real release build
Release builds can behave differently from the dev client, so check these on an
actual installed-from-Play build:

- [ ] Neon app icon shows on the home screen (+ splash screen)
- [ ] Picking a profile photo opens the system photo picker with **no permission
      prompt** (the READ_MEDIA_IMAGES fix)
- [ ] An **online** game connects and syncs (Firebase works outside dev) — host
      on one phone, join with the room code on another
- [ ] A **local Wi-Fi** game still works
- [ ] Content is correct: no Wild Round anywhere; About shows "Created by
      TwistedMetl"; games list is the 8 games
- [ ] Play a full round of each game once to confirm nothing regressed in release

## If the review is REJECTED
- Read Google's reason carefully; it's usually one specific policy item.
- Common first-timer rejections: data-safety mismatch, content-rating mismatch,
  or a permission not declared. Bring the exact wording back and we'll fix it.

---

## Known open items (do BEFORE a public production launch)
- [x] **Firebase security rules — DEPLOYED 2026-07-04** (published in the console).
      Hardened rules at `database.rules.json` (only stores `rooms/*`;
      coins/profile/achievements are local, never in Firebase).
      **Still to confirm:** re-test online MP end-to-end (host + join + play) so a
      rule mistake would surface as a failed join/move. Original deploy steps kept
      below for reference:
        1. Firebase console → your project → Realtime Database → **Rules** tab.
        2. Replace the wide-open test rules with the contents of
           `database.rules.json`, then **Publish**. (Or, with the Firebase CLI:
           `firebase deploy --only database` — `firebase.json` points at the file.)
        3. Re-test online multiplayer end-to-end afterward (host + join + play):
           the rules restrict writes, so a mistake would surface as failed
           joins/moves. See the checklist below.
      NOTE: `database.rules.json` is kept **comment-free on purpose** — the console
      Rules editor errors ("Line 2: Expected 'rules' property") if the top level is
      anything but a single `rules` key. Do NOT re-add `"//"` comment keys.
      Also confirm **Anonymous** sign-in is enabled (Authentication → Sign-in
      method) — the rules require `auth != null`, so nothing works without it.
      Full rule-by-rule explanation lives in `DATABASE_RULES.md`.
- [ ] **Each upload needs a higher versionCode** — next build is 9, then 10, etc.
      (bump `app.json` → android.versionCode before every `eas build`).

## Future work (whenever you're ready)
- [ ] **iOS / App Store** — see `IOS_SETUP.md` (Apple Developer account + iOS
      Firebase `GoogleService-Info.plist`, then Claude wires the repo side).
      Payoff: iPhone friends can play online with Android friends (cross-platform).
- [ ] **Game expansion** — see `GAME_ROADMAP.md` (top pick: Hearts, fills the
      trick-taking gap; plus dice + party games).
- [ ] **Freemium unlock** — gate online multiplayer behind a one-time in-app
      purchase. Requires a merchant account + `react-native-iap` + a rebuild.
      When this ships, update the Play "Digital purchases" data-safety answer to
      Yes.
- [ ] **Online variant selection** for Poker/Rummy (currently defaults to Texas
      Hold'em / Gin Rummy in online mode).
- [ ] **Poker AI is too weak** — folds far too often, making single-player Poker
      trivial and unsatisfying (noticed 2026-07-01). Improve the AI's betting
      logic (call/raise more with reasonable hands). Also why the "win an all-in"
      achievement was cut — outcomes vs this AI are too easy to game.

## Build recipe (reminder)
```
git pull origin main
# delete stale native folders so EAS prebuilds fresh from app.json:
Remove-Item -Recurse -Force android, ios -ErrorAction SilentlyContinue
eas build --profile production --platform android
```
(The `android/` folder must not exist locally, or EAS skips prebuild and ignores
app.json changes — that caused the versionCode/permission issues on v4–v6.)

---
verified: 2026-08-15
---

# Important reminders

### Daily workflow

- Start dev server with: `npx expo start --dev-client` (NOT plain `npx expo start`)
- Both phones must be on same WiFi or one phone's hotspot
- Using hotspot: host gets `192.168.4.1`, joining phones get `192.168.4.X`
- School/work WiFi often uses `10.27.27.x` subnet — both work as long as phones share
  a subnet

### Save habit (do this between every meaningful change)

```
git add . && git commit -m "what I just did" && git push
```

### When to do a NEW EAS build

Only when adding a NEW native package. JS-only changes don't need a rebuild. See
[[Build and Release]] for what's actually pending right now.

### Coding patterns established

- Game logic files (`game/*.js`): pure functions only, no React, easy to test
- Multiplayer game screens use the `fullRef` / `applyState` / `toPublic` /
  `PRIVATE_HAND` pattern — see [[Multiplayer Screen Pattern]]
- Host runs all game logic, broadcasts public state, sends private hands to each client
- Clients send ACTION messages to host

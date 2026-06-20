# WHO AM I? — game spec

A multiplayer party game (no cards). Each round one player is the **judge**: they
type a secret (a celebrity, character, or thing). The other players are **askers**
who take turns asking yes/no questions to guess it. The judge answers
**Yes / No / "You got it!"**; whoever earns the "You got it!" wins the round.
First to **3 round-wins** wins the game. Multiplayer-only (3–8 players, no AI).

Built on the Wild Round blueprint (host + rotating judge + private info +
adjudication), reusing `game/GameNetwork.js`.

## Locked decisions

- **Judge types the secret** each round (no built-in list).
- **Judge rotates** each round (everyone plays). Needs **3+ players**.
- **"You got it!" auto-credits the current asker** (a guess is just a question
  naming the thing — no player-picker).
- **First to N round-wins** (default **3**).

## Round / phase flow

1. **choosing** — the round's judge types the secret and taps "Set It"; everyone
   else sees "Waiting for {judge}…". The secret is **private to the judge** and is
   never broadcast.
2. **asking** — non-judge players take turns (in seating order, wrapping):
   - The current asker types a yes/no question → it becomes the *pending question*,
     broadcast to all (and shown to the judge with Yes / No / "You got it!").
   - Judge **Yes/No** → logged in the shared Q&A history, turn passes to the next
     asker.
   - Judge **"You got it!"** → the current asker wins the round (`score+1`).
3. **round end** — if the winner reached the target → **gameOver** (winner
   screen, host can Play Again); else **nextRound**: rotate judge, clear history,
   back to *choosing*.

## Code map

- `game/whoami.js` — pure logic: `createGame`, `setSecret`, `askQuestion`,
  `recordAnswer`, `awardRound`, `nextRound`, `checkWin`, `toPublic` (strips the
  secret), helpers `nonJudgePlayers`/`currentJudge`/`currentAsker`.
- `__tests__/whoami.test.js` — 17 unit tests (rotation, asker wrap, pending
  lifecycle, scoring/win, phase flow).
- `screens/WhoAmIGameScreen.js` — the networked screen. Host holds authoritative
  state and `applyState` broadcasts `GAME_STATE` (public) + sends `PRIVATE_SECRET`
  only to the judge. Messages: client→host `SET_SECRET` / `ASK_QUESTION` /
  `JUDGE_ANSWER`; host→clients `GAME_STATE` / `PRIVATE_SECRET`. Free-text input
  (TextInput + KeyboardAvoidingView) for both the secret and questions.
- **Profile pictures:** players' avatars show in the scoreboard + the round-win
  banner. Exchanged peer-to-peer at game start (not in the per-turn broadcasts):
  clients `sendToHost({type:"AVATAR"})`, the host merges + broadcasts `AVATARS`
  (id→avatar). Emoji presets send their id; custom photos are resized + base64
  data-URI'd by `game/avatarTransmit.js`; rendered via `components/ProfileAvatar`.
  (Pilot for the multiplayer profile-pictures goal — spread to other games next.)
- Registration: `screens/LobbyScreen.js` (`GAMES` + `WHEEL_OPTIONS`), `App.js`
  (`WhoAmIGame` route), `game/tableThemes.js` + `components/GameHeader.js`
  (purple "whoami" theme/kicker).

## Test bots

The lobby allows **Add Computer** (`hasAI:true`) so the host can play solo (host
+ bots) to exercise the flow on one device. Bots are **test stubs**, not real
players: a bot judge picks a secret from a canned list and answers with simple
logic (Yes/No biased to No; says "You got it!" when a question literally contains
its secret, so a human asker can still win); bot askers send generic questions to
drive the turns. The bot's secret is never shown to the host human. Driven on the
host via a timer effect in `WhoAmIGameScreen` (`BOT_SECRETS`/`BOT_QUESTIONS`).

## Out of scope (v1)

- Built-in celebrity list / categories (judge types it; bots use a canned list).
- Real AI opponents (bots can't reason about free text — test stubs only).
- Mid-game reconnect/pause (the separate, parked reconnect feature — a drop
  currently can stall the round, same as the other games until that lands).
- In-app How-to entry (menu has Quit only for now).

## Verification

- Logic: `npx jest __tests__/whoami.test.js` (full suite 314 pass).
- On device (3+ players): host "Who Am I?" from the lobby → each round a
  different player privately types the secret → askers take turns typing yes/no
  questions → judge answers (logged) and "You got it!" credits the asker →
  first to 3 wins. Confirm the keyboard never hides the inputs and players can't
  act out of turn.

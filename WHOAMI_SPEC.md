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
- Registration: `screens/LobbyScreen.js` (`GAMES` + `WHEEL_OPTIONS`), `App.js`
  (`WhoAmIGame` route), `game/tableThemes.js` + `components/GameHeader.js`
  (purple "whoami" theme/kicker).

## Out of scope (v1)

- Built-in celebrity list / categories.
- Single-player / AI.
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

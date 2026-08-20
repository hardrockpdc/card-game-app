# How-to screenshots

Annotated gameplay screenshots shown in **How to Play → In the App**
(`screens/HowToPlayScreen.js` → `IN_APP_SHOTS`, rendered by
`components/HowToShot.js`).

Current shots (resized to ≤1400px, JPEG q78): `blackjack-bet`, `blackjack-play`,
`gofish`, `conquian`, `poker`, `rummy`, `solitaire`, `lastcard`. Wild Round has
no shot (multiplayer-only) so it falls back to text controls.

## Adding / replacing one

1. Capture the game mid-play, framed on the controls.
2. Drop the raw screenshot in this folder (any name) and tell Claude — it will
   resize/recompress it to `<name>.jpg`, read it to place the numbered marker
   dots, and wire it into `IN_APP_SHOTS`.
3. Each shot's `markers` are `{ x, y, label }` where x/y are 0–100 percentages
   of the image (top-left origin). A game can have multiple shots (Blackjack has
   two: betting + play). Positions are easy to nudge — just say which dot to move.

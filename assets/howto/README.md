# How-to screenshots

Annotated gameplay screenshots shown in the **How to Play → In the App** section
(`screens/HowToPlayScreen.js` → `IN_APP_SHOTS`, rendered by
`components/HowToShot.js`).

## How to add one

1. **Capture** a screenshot of the game mid-play, framed on the controls the
   How-to describes (the hand + action buttons). Portrait is fine; crop out the
   status bar / dead space so the image isn't mostly empty.
2. **Save** it here as `<gameId>.png` using the game's id:
   `blackjack, gofish, conquian, poker, rummy, solitaire, lastcard, wildround`.
   (Note: the id for Go Fish is `gofish`, Last Card is `lastcard`.)
3. Tell Claude it's added (and roughly where each control is on the shot, e.g.
   "Ask button is bottom-center, opponent seats across the top"). Claude wires it
   into `IN_APP_SHOTS` and positions the numbered marker dots so dot #1 lines up
   with control #1, dot #2 with control #2, etc. (the numbered list below the
   image is the legend).

Until a `<gameId>.png` exists, that game's "In the App" section just shows the
text controls — adding the image is purely additive.

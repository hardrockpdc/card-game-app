---
verified: 2026-08-15
---

# Multiplayer game screen pattern

Used by the current multiplayer games (Conquián, Go Fish, Poker, Rummy, Last Card, Who
Am I? — Wild Round used this pattern too before its removal, see [[BUG-5]]):

- `fullRef` — host only, holds complete state including private hands
- `applyState(newState)` — updates the ref + React state + broadcasts to all clients
- `toPublic(state)` / `toPublicState(state)` — strips private data before broadcasting
- Clients receive `GAME_STATE` (public) + `PRIVATE_HAND` (their cards only)
- **Host finds itself by `p.id === "host"`** (confirmed still true today, e.g.
  `PokerGameScreen.js:879`, `ConquianGameScreen.js`) — **clients find themselves by
  `p.name === myName`**, then resolve their numeric network `clientId` to a player
  record via `String(id)` comparisons. This id-type mixing (a plain incrementing
  integer `clientId` from `game/GameNetwork.js` vs. string player ids, with
  inconsistent `String()` normalization across screens) is a real, still-open
  correctness risk — see [[CQ-8]] for the full audit and a concrete example of the
  inconsistency actually diverging within one screen.

### Game-specific notes

**Blackjack:** Standard rules, dealer hits to 16 stands on 17, blackjack pays normal.
Split supported (two same-rank cards → Split button; two hands played in sequence;
dealer plays once against both; single-player and multiplayer). *Multiplayer Blackjack
itself was removed entirely 2026-06-18 as dead code — see [[BUG-1]]; single-player
Blackjack (`GameScreen.js`) is unaffected.*

**Go Fish:** Private hands; two-step ask (tap card in hand to pick rank, tap player to
pick target, then Ask). Extra turn if target had the rank OR the drawn card matches the
asked rank. Books (4-of-a-kind) auto-complete; 13 books ends the game. 7 cards each for
2 players, 5 each for 3+. Hand auto-sorts by rank. AI: Easy/Medium/Hard. Was the
original mid-game-reconnect pilot game (2026-06-19) but never migrated to the rebuilt
reconnect system — any drop, deliberate or accidental, still just ends the game after a
60s pause. See [[BUG-7]].

**Poker (Texas Hold'em / Omaha / Five Card Draw / Seven Card Stud):** Private hole
cards; blinds 10/20; starting chips 500. Streets: preflop → flop → turn → river →
showdown. Actions: Fold, Check, Call, Raise. Hand ranking: Royal Flush down to High
Card. Pot split on tie. Dealer rotates each hand. AI: Easy/Medium/Hard. Multiplayer
tournament-end handling is deliberately unbuilt — `tournamentWinner` is only set in the
single-player branch, so MP freezes once players drop below 2 (no winner/results/coins).
Parked, not a bug to fix casually — needs 2-device testing when picked up.

**Conquián:** Mexican rummy. 40-card Mexican deck (A,2-7,J,Q,K). 7-J-Q-K is a valid run
sequence. Initial Card Pass at the start of every game (simultaneous blind clockwise
pass). Priority Chain mechanic for discards/passes. Borrowing rule (rearrange own melds
when taking a card). Win at hand_size+1 melded cards. AI: Easy/Medium/Hard.

**Last Card:** UNO-style/clan game. 2-8 players. Single and multiplayer. The only game
with the full rebuilt reconnect system (`useOnlineReconnect`) — see
[[Project Facts]]. Wild +4 restriction and its dimming/message history are documented
decisions — see [[Wild +4 Restriction]] and [[Illegal-Tap Feedback Removed]].

**Solitaire:** Single-player only. Klondike, Spider, FreeCell, Pyramid, TriPeaks.
Drag-and-drop landed for Klondike/FreeCell/Spider (landscape); tap-to-move on all
variants got a real fly/FLIP animation 2026-07-05, but drag-and-drop's own successful
drop still snaps instantly — see [[IMP-8]].

**Rummy:** Single + multiplayer. Gin Rummy, Rummy 500, Indian Rummy, Canasta. AI single
difficulty. Lobby and Single Player picker both wired.

**Who Am I?:** Multiplayer party game, no cards. Rotating judge types a secret each
round; askers ask yes/no questions; first to 3 round-wins. No AI/solo-bot fallback
(removed after it "played well" in bot testing) and no record of a real 3+-device test
ever having happened — see [[CQ-16]].

**Memory Match:** Single-player only. Flip to find identical pairs, Easy/Medium/Hard.
The only game with zero save/resume — see [[BUG-4]].

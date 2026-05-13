# 🎴 Wild Round — Complete Build Spec

## Overview

A new party card game for the Card Night app, mechanically inspired by Cards Against Humanity but with **100% original or CC0-licensed content** and a unique name. The game is a Judge-style party game where one player picks the funniest answer to a fill-in-the-blank prompt.

## Project Integration

- **Game name in app:** "Wild Round"
- **App name:** "Card Night"
- **New game logic file:** `game/wildround.js`
- **New screen file:** `screens/WildRoundGameScreen.js`
- **Card content file:** `game/wildroundCards.json`
- **Add `'Wild Round'` to the Lobby's game selector chip row**
- **Special:** Lobby must enforce **3-player minimum** for Wild Round (other games allow 2)
- Wire navigation in `App.js`
- Follow same multiplayer pattern as existing games (`fullRef`, `applyState`, `toPublic`, `PRIVATE_HAND` broadcasts)

## Legal Notes

- **Content must be original or CC0** (truly public domain, no attribution required, commercial-use OK)
- **Do NOT use Cards Against Humanity's Creative Commons cards** — their NC (non-commercial) license blocks future monetization
- **Do NOT use trademarked names, characters, or obvious CAH content**
- The game mechanics themselves (judge picks funniest answer) are NOT copyrightable, only specific card content and branding

---

## Game Configuration

| Setting       | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Game type     | Party / Judge-style                                    |
| Players       | 3 minimum, 8 maximum                                   |
| Hand size     | 10 answer cards per player                             |
| Win condition | First to 10 points                                     |
| Card content  | One tagged JSON file with `tone: 'family' \| 'mature'` |
| Tone toggle   | Host picks at lobby (Family or Mature)                 |
| Mature mode   | Includes BOTH family + mature cards (bigger pool)      |
| Family mode   | Family-only cards                                      |

## Card Structure

Single tagged JSON file at `game/wildroundCards.json`:

```json
{
  "prompts": [
    {
      "id": "p001",
      "text": "Why am I crying right now?",
      "tone": "family",
      "source": "original"
    },
    {
      "id": "p002",
      "text": "The next viral trend is ___",
      "tone": "family",
      "source": "cc0"
    }
  ],
  "answers": [
    {
      "id": "a001",
      "text": "A surprise birthday cake on fire",
      "tone": "family",
      "source": "original"
    },
    { "id": "a002", "text": "...", "tone": "mature", "source": "cc0" }
  ]
}
```

**Field meanings:**

- `id` — unique identifier (e.g. `p001` for prompts, `a001` for answers)
- `text` — the actual card text (questions or `___` blanks)
- `tone` — `"family"` or `"mature"` for the toggle filter
- `source` — `"original"`, `"cc0"`, or `"user"` (for tracking)

**Prompt formats allowed:**

- Question style: `"Why am I crying right now?"`
- Single-blank style: `"The next viral trend is ___"`
- (Multi-blank style is NOT supported in v1)

**Target counts at launch:** ~100 prompts + ~300 answers (mostly CC0, sprinkled with originals over time).

**For initial build:** Use ~20 placeholder cards. Real content gets bulk-added in Phase E.

## Game Flow (Round-by-Round)

### Setup (start of each game)

- 1. Deal 10 answer cards to each player
- 2. Pick a starting Judge (random for first game; rotates clockwise after that)
- 3. Skip the "Initial Card Pass" — that's a Conquián-only thing, not used here

### Round flow

```
1. JUDGE SKIP PHASE (judge only)
   - Only the judge sees Prompt 1
   - Other players see "Judge is choosing prompt..."
   - Judge can:
     * KEEP Prompt 1 → locks it in for everyone, proceed to step 2
     * SKIP Prompt 1 → shuffled back into deck, draw Prompt 2
       - Judge MUST keep Prompt 2 (only one skip allowed per round)
   - Once judge locks a prompt, all players see it

2. SUBMISSION PHASE
   - All non-judge players see the prompt + their hand at the bottom
   - Each player taps an answer card to highlight it, then taps "Submit" to confirm
   - Once submitted, locked in (no changing)
   - NO TIMER — round waits indefinitely until everyone submits
   - Judge sees "Waiting for X more players to submit..."

3. JUDGE PICKS WINNER
   - Once all submissions are in, they're shuffled (anonymous order)
   - Judge sees them in a swipeable carousel — swipe through, tap winner
   - All other players see "Judge is picking..."

4. REVEAL PHASE
   - Winning card is shown along with the player who submitted it
   - All other submissions are also revealed with submitter names (great for trash talk)
   - Winner gets +1 point

5. ROUND END
   - All used cards (prompt + submissions) go to discard pile (not reshuffled until deck empty)
   - Each player draws back up to 10 cards
   - Next player clockwise becomes Judge
   - Tap "Next Round" to begin again

6. WIN CHECK
   - First player to reach 10 points wins immediately
   - Game ends, winner shown on a victory screen
```

### Important rules

- **Judge never submits** — they only judge
- **Judge can skip ONCE per round** (one prompt re-draw allowed, then locked)
- **No timer** — players can take all the time they want to submit
- **Submissions are anonymous DURING judging**, then revealed AFTER
- **Score is always visible** next to each player's name (`X/10` format)
- **No reshuffle until deck empty** — once a card is used, it's out for the rest of the game

## End Conditions

- **Win:** First player to reach **10 points** wins instantly
- **Stalemate:** Not possible (every round produces a winner)
- **Mid-game leave:** If a player disconnects, host should be able to either continue with remaining players or end the game (handle gracefully)

## UI Requirements

### Lobby additions

- Wild Round option in game selector
- **3-player minimum** check — Start Game button disabled with message "Wild Round needs at least 3 players" if fewer
- **Tone toggle** — visible only when Wild Round is selected (Family / Mature)

### In-game player view (non-judge)

- **Top:** Active prompt (large, centered)
- **Top right:** Player scores (`Pedro 3/10`, `Maria 5/10`, etc.)
- **Middle:** "Judge is choosing prompt..." or "Waiting for submissions..." status text
- **Bottom:** Scrollable list of your 10 answer cards
- **Tap to highlight** a card, then tap **Submit** button to confirm
- After submit: cards greyed out, "Submitted! Waiting for others..." message

### In-game judge view (during skip phase)

- **Top:** Prompt 1 (large)
- **Two buttons:** "Keep this prompt" / "Skip and draw new"
- After choosing: prompt locks in, other players see it

### In-game judge view (during judging phase)

- **Top:** Active prompt
- **Center:** Swipeable carousel of submissions (cards anonymous, no names)
- **Tap a card to select winner** → confirmation prompt → reveal phase

### Reveal phase view (everyone)

- **Winning card** displayed prominently with submitter name + "+1 point"
- **Other submissions** shown below with submitter names
- **"Next Round"** button (host-only? or anyone? see implementation note)

### Game-over view

- **Winner announcement** (large)
- **Final scoreboard**
- **"Play Again"** and **"Back to Lobby"** buttons

## Multiplayer Sync

Follow the existing pattern from other games:

- **Host runs all logic** — deals cards, picks prompts, validates submissions, awards points
- **Public state** broadcast to all (`GAME_STATE`): scores, current prompt (after judge locks), submissions (during judge phase), winner reveal
- **Private state** broadcast to each client (`PRIVATE_HAND`): their 10 answer cards, judge sees their prompt during skip phase
- **Client → Host messages:**
  - `JUDGE_KEEP_PROMPT` (judge only)
  - `JUDGE_SKIP_PROMPT` (judge only, max once per round)
  - `SUBMIT_CARD` (non-judges, with card ID)
  - `JUDGE_PICK_WINNER` (judge only, with submission ID)
  - `NEXT_ROUND` (host triggers after reveal)

## Admin Card Editor (for Pedro only, v1)

A hidden interface to manage cards without touching code.

**Access pattern:**

- Long-press the app version number 5 times in Settings, OR
- Hardcoded check: if player name = "PedroAdmin" or similar, show editor button

**Editor features:**

- View all cards (filterable by tone, type)
- Add new card: pick type (prompt/answer), pick tone (family/mature), enter text
- Edit existing card text
- Delete card
- Save changes to `wildroundCards.json` (file stored on device for now; later we could make it sync)

**Technical note:**

- React Native can't easily write to bundled JSON in production builds, so the editor likely needs to use AsyncStorage as an "overlay" — bundled cards + user-added/edited cards merged at runtime. Claude Code will figure out the best pattern.

## AI Behavior (Single-Player Mode)

- **AI submitter:** Picks a random card from its hand (humor is subjective; smart picking adds no real value)
- **AI judge:** Picks a random submission as winner (same reason)
- **AI judge skip:** 50/50 chance to skip Prompt 1 (gives variety)
- Single difficulty level for v1

## Phased Build Plan (Sequential — Each Phase Tested Before Next)

### Phase A: Card Data + Game Logic

- Create `game/wildroundCards.json` with ~20 placeholder cards (mix of family + mature, prompts + answers)
- Build `game/wildround.js` with pure functions:
  - `createDeck(tone)` — returns filtered card pool
  - `dealHands(players, deck)` — deals 10 to each
  - `pickPrompt(deck)` — draws next prompt
  - `processSubmission(state, playerId, cardId)` — validates and stores
  - `pickWinner(state, submissionId)` — awards point, replenishes hands
  - `checkWin(state)` — returns winner if any player at 10 points
- Test with `console.log` — verify rules work in isolation
- **Goal: prove the rules work without UI**

### Phase B: Single-player UI (vs. simple AI)

- Build `screens/WildRoundGameScreen.js` with all UI per spec
- AI players auto-submit random cards
- AI judge picks randomly
- Manually trigger each phase (skip → submit → judge → reveal → next)
- Test full game from start to 10-point win
- **Goal: visual confirmation the game flows well**

### Phase C: Multiplayer

- Wire up host/client networking using existing patterns
- Each phone shows their hand privately via `PRIVATE_HAND`
- Host orchestrates rounds and broadcasts public state
- Add to Lobby's game selector with **3-player minimum** check
- Add tone toggle (Family/Mature) to Lobby (only visible when Wild Round selected)
- Test on 3 phones
- **Goal: full multiplayer Wild Round**

### Phase D: Admin Card Editor

- Hidden access pattern (long-press app version 5x or similar)
- Form: type / tone / text
- View list of existing cards (filterable)
- Edit / delete existing cards
- Persist changes via AsyncStorage overlay on top of bundled JSON
- **Goal: Pedro can add/edit cards without code**

### Phase E: Real Content

- Find CC0 sources (no CAH official cards due to NC license)
- Bulk-add ~80 prompts + 280 answers from CC0 + originals
- Total ~100 prompts + ~300 answers
- Tag each appropriately (family/mature)
- Playtest for variety / repetition
- **Goal: launch-ready content**

### Phase F: Polish (later)

- Animations (cards flying to center, winner reveal flourish)
- Sounds (card flip, point earned, victory)
- Better card visuals (background colors per tone, font polish)
- Themed packs (Movies, Sports, etc.) — Phase F+
- Multi-language for cards (Spanish translations of family-friendly subset)

## Handoff Prompt for Claude Code

```
I'm adding a new party-style card game called "Wild Round" to my React Native
card game app "Card Night" (alongside Blackjack, Crazy 8s, War, Go Fish, Rummy,
Snap, Poker, Conquián).

The complete spec is in WILDROUND_SPEC.md — please read it fully.
Also read PROJECT_NOTES.md for the existing app patterns and tech stack.

This is a NEW game — no existing implementation to remove.

Step 1: Summarize Phase A in your own words and confirm we're aligned BEFORE
writing any code.

Step 2: Build Phase A only:
  - Create game/wildroundCards.json with ~20 placeholder cards
  - Create game/wildround.js with pure functions for deck creation, dealing,
    prompt picking, submission processing, winner picking, and win checking
  - Add console-based tests to verify the rules work
  - Don't add any UI yet — that's Phase B

Step 3: Wait for my approval before moving to Phase B.

Important habits:
- Commit to git before each phase begins
- Test after each meaningful change
- Stop and ask if scope creeps beyond the current phase
- Keep PROJECT_NOTES.md updated at the end of session
- IMPORTANT: All card content must be original or genuinely CC0 (public domain).
  Do NOT use Cards Against Humanity content even though it's CC-licensed —
  their NC license blocks future monetization.
```

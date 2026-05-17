# Animations.md — Card Game Animation Spec (Readable + Repo-Aware)

## Goal

Define consistent, understandable animation behavior for the card game UI.

This file is written as a **human-readable spec**, but it also includes **repo-specific observations** from this project so future animation work matches what your codebase already does.

---

## What you already have in this repo (important context)

### Card rendering is currently “state-driven” (no animated flip)

- `components/Card.js` renders a static `<Image />`.
- The face is selected by swapping the image source:
  - `faceDown ? getCardBackImage() : getCardImage(rank, suit)`
- There is **no flip animation**—when `faceDown` changes, the image simply changes on re-render.

**Update (animation work, Phase 1):** Card.js now supports a 3D flip animation when both `animateReveal` is passed AND the `faceDown` prop changes. The animation is opt-in — all other Card.js usages in the codebase continue to render a single Image with no animation overhead. The Blackjack dealer's hole card in screens/GameScreen.js uses this. Multiplayer Blackjack and Solitaire still use the instant swap pending further work.

**Update (animation work, Phase 2):** Card.js now also supports a slide-in deal animation via the `animateDeal` and `dealDelay` props. When `animateDeal` is true, the card mounts at translateY: -200 and opacity: 0, then animates to final position over 350ms. Used in screens/GameScreen.js (single-player Blackjack) for the player's hand and split hand, both on initial deal (staggered 100ms apart) and on every hit. The first render after mount is skipped via a hasMountedRef so resume-from-save doesn't animate existing cards. Dealer cards, multiplayer, and other games still appear instantly pending further work.

### Blackjack “deal / hit / stand” is currently instant

- `screens/GameScreen.js`:
  - `handleDeal`, `handleHit`, `handleStand` all update React state immediately.
  - `playSound("card_deal")` / `playSound("card_flip")` provide feedback, but cards don’t animate position/flip.
- `screens/MultiplayerGameScreen.js` is the same idea:
  - game logic computes new state; UI re-renders.

### Solitaire stacks update by layout changes (no animated motion)

- `screens/SolitaireGameScreen.js` renders multiple `CardSlot`s.
- Card stacking uses layout/overlap via styles like:
  - `stackCardOverlap: { marginTop: -44 }`
- When card ownership changes (move/undo/draw), the hand visually “teleports” because layout updates without animation.

### Overlay transitions currently use fade

- `components/EndOfRoundModal.js`: `Modal` with `animationType="fade"`.
- `components/TutorialOverlay.js`: `Modal` with `animationType="fade"`.
- These are consistent today: overlays fade in/out.

### Toast uses Animated opacity + timers

- `components/Toast.js`:
  - fade in duration **180ms**
  - stays ~**2000ms**
  - fade out duration **280ms**
  - uses `useNativeDriver: true`

---

## Design principles (non-negotiables)

1. **Consistency over novelty**
   Same action types (deal, play, draw, discard, win/lose) use the same durations/easing and visual language.
2. **Interruptible / resumable**
   Animations should not “break” if navigation, round transitions, or resume-from-save happens mid-animation.
3. **Clear end state**
   Every animation must land on a final, unambiguous UI state (card position + face + visibility).
4. **No accidental overlap**
   Use predictable stacking rules (z-order) so the moving card is always readable.
5. **Respect reduced motion**
   If reduced motion is enabled, shorten/disable non-essential motion while preserving meaning.

---

## Terminology

- **Card identity**: a unique card (e.g., `Q♠`), represented in code by `card.id`.
- **Source**: current rendered location (table, hand slot, discard pile, deck pile).
- **Destination**: target location after the action.
- **Face state**: face-up vs face-down.
- **Action**: a game event that triggers animation (deal, play, draw, discard, etc.).
- **Micro-animation**: short UI feedback (highlight, button pressed, toast in/out).

---

## Timing guidelines (defaults)

Use these as defaults unless a recipe overrides them:

- **Micro-animation (feedback):** 120–200ms
- **Card travel / move:** 250–450ms
- **Flip:** 180–280ms
- **Modal open/close:** 180–320ms (or use existing `Modal animationType="fade"` behavior)
- **End-of-round transitions:** 400–700ms

**Easing (conceptual):**

- Card travel should feel “snappy but not robotic” (ease-out feel).
- Flip midpoint should be readable (swap face/back around ~50%).

---

## Animation “recipes”

> Repo reality check: right now, most recipes are **implemented as instantaneous state changes**. This section describes the intended behaviors; when you implement them, align with these timings and end states.

### 1) Card Deal / Add to Hand

**Trigger:** new round starts; cards are dealt to player(s).
**Elements:** deck pile (optional), destination hand slots.
**Behavior:**

- Option A (visual clarity): cards “fan”/slide into hand slots.
- Option B (simplicity): cards move one-by-one to their final hand slot.
  **What changes:**
- Card becomes visible face-up/face-down based on game mode.
- Hand layout settles after each step (or after the sequence).
  **Default duration:** 300–450ms per card.

**Repo mapping (current):**

- Blackjack currently sets `playerHand`/`dealerHand` and lets UI re-render; no animation.

---

### 2) Card Flip (Face-Up / Face-Down)

**Trigger:** reveal a card, turn it face-down, or flip due to rule.
**Elements:** the single card.
**Behavior:**

- Use a horizontal flip illusion (front/back swap) aligned to the animation midpoint.
- Swap face/back at ~50% progress.
  **What changes:**
- Face state toggles at midpoint.
  **Default duration:** 200–280ms.

**Repo mapping (current):**

- Blackjack/Multiplayer/Solitaire flip is currently just `faceDown` / `faceUp` image swapping in `components/Card.js` (instant, no Animated transform).

**Implementation note (future):**

- Because `Card` currently renders only one `<Image />` at a time, a flip animation likely needs:
  - either a wrapper component that renders **both** front/back images and animates between them, or
  - modifying `Card` to support an animated flip mode (recommended to keep the current `Card` simple).

---

### 3) Play a Card to Table (from Hand → Table Slot)

**Trigger:** user selects a card to play.
**Elements:** selected card; table destination stack/slot.
**Behavior:**

- Card moves from its hand slot to destination.
- Optional: slight rotation/scale emphasis during travel (small and consistent).
  **What changes:**
- Card face state after arrival depends on game.
- Source hand removes the card at start or arrival (choose one rule and keep it consistent).
  **Default duration:** 300–450ms.

**Repo mapping (current):**

- Blackjack: hit/stand logic appends/removes cards instantly.
- Solitaire: stack/ownership changes instantly; overlap uses negative margins.

---

### 4) Draw (Deck → Hand)

**Trigger:** rule requires drawing a card.
**Elements:** deck pile → hand slot (or a temporary draw reveal position).
**Behavior:**

- Deck visual count update is optional.
- The drawn card travels to the target hand slot.
  **Default duration:** 250–400ms.

**Repo mapping (current):**

- Solitaire stock → waste (or klondike/spider dealt rows) updates state immediately; no movement animation.

---

### 5) Discard (Hand → Discard Pile)

**Trigger:** rule requires discarding.
**Elements:** hand card → discard pile.
**Behavior:**

- Card travels to discard pile.
- Optional: brief scale/highlight on arrival.
  **Default duration:** 250–400ms.

---

### 6) Reordering / Hand Layout Settling

**Trigger:** hand size changes; card removed/added; selection moves.
**Elements:** remaining cards in that layout.
**Behavior:**

- Cards slide into their new slots smoothly.
  **Default duration:** 180–320ms.

**Repo mapping (current):**

- Solitaire stack spacing relies on `marginTop` overlap. Without animated layout, cards jump to new positions when their order changes.

---

### 7) Round End Transition (Win/Lose/Result)

**Trigger:** round completes; result modal shown.
**Elements:** result banner, stats strip, modals.
**Behavior:**

- Show result emphasis (micro-animation) + fade/slide for panels.
- Avoid excessive movement that harms readability.
  **Default duration:** 400–700ms.

**Repo mapping (current):**

- End-of-round modal uses `Modal animationType="fade"` in `components/EndOfRoundModal.js`.

---

### 8) Modal Open/Close (End-of-Round, Tutorial, etc.)

**Trigger:** modal becomes visible / hidden.
**Elements:** modal container + backdrop.
**Behavior (current style in repo):**

- Backdrop fade-in/out.
- Modal fades in/out (currently via RN `Modal` prop `animationType="fade"`).
  **Default duration:** 180–320ms (or accept the native RN fade).

**Repo mapping (current):**

- `EndOfRoundModal.js`: `animationType="fade"`
- `TutorialOverlay.js`: `animationType="fade"`

**Future extension:**

- If you want more than fade later, standardize one style (e.g., fade + scale OR fade + slide) and reuse everywhere.

---

### 9) Toast / Notification Feedback

**Trigger:** status message shown/cleared.
**Elements:** toast component.
**Behavior:**

- Toast fades in quickly, stays, then fades out.
  **Default duration (repo-accurate):**
- In: 180ms
- Stay: ~2000ms
- Out: 280ms

**Repo mapping (current):**

- Exactly matches `components/Toast.js`.

---

### 10) Variant Picker Animations

**Trigger:** user opens a variant picker; selection is highlighted.
**Elements:** picker items.
**Behavior:**

- Selection highlight is a micro-animation (pulse/outline) with minimal motion.
  **Default duration:** 180–320ms.

---

## Animation state & interruption model (recommended)

To keep behavior understandable and bug-resistant, treat animations as stateful sequences once movement/flip become animated.

### Recommended fields (conceptual)

- `animationQueue`: ordered list of pending animation steps
- `currentAnimation`: step being played
- `isReducedMotion`: derived preference
- `activeCardId`: the card being animated (if applicable)
- `cancelToken`: how to stop/flush safely

### Handling interruptions

- **Cancel**: stop current motion immediately and snap to correct end state (or last-known stable state).
- **Replace**: if a new game event supersedes the old one, replace the queue rather than layering.
- **Resume**: only if the game supports safe resumption; otherwise snap.

---

## Accessibility: reduced motion

If reduced motion is enabled:

- Disable/shorten travel animations (keep only minimal emphasis).
- Still perform meaning-preserving changes (face state + layout correctness must still happen).

**Repo mapping (current):**

- No reduced-motion logic is present in animation code (overlays/toast use fixed durations).

---

## Checklist for “animation-ready” features

When implementing any new animation, confirm:

- [ ] Defined trigger(s) and final state
- [ ] Correct card identity is used (no wrong element moving)
- [ ] Duration/easing matches the relevant recipe
- [ ] Face state swap happens at the right time (for flips)
- [ ] Z-order/hitboxes remain correct after animation ends
- [ ] Interrupt handling is specified (cancel/replace/resume)
- [ ] Reduced motion behavior is defined

---

## Repo-specific “next animation work” suggestions (prioritized)

1. **Flip animation (lowest risk, highest perceived polish)**
   - Today, flips are instant because `Card` just swaps image by `faceDown`.
   - Add a standardized flip animation used by Blackjack (dealer reveal), and Solitaire (when hidden cards become face-up).

2. **Card move animation for Blackjack first (small surface area)**
   - Blackjack only animates between:
     - player hand
     - dealer hand
     - “cards removed” on hit/stand
   - Deck animation can be optional; move 1–2 cards at a time.

3. **Solitaire movement via “animated layout”**
   - Solitaire uses overlap/stacking with negative margins.
   - Consider implementing either:
     - Animated layout transitions for stack reflow, or
     - absolute-position rendering for cards during animation (more complex).
   - Start with small moves (waste → tableau, tableau → foundation) before multi-card sequences.

---

## Open questions to finalize the spec

- [x] **Flip implementation:** 3D rotation (rotateY transform). Two stacked Images with backfaceVisibility: hidden. Implemented in components/Card.js behind an opt-in `animateReveal` prop. Duration 260ms, ease-out, useNativeDriver true. Reduced motion check via AccessibilityInfo.

- [ ] For movement: do you want “deck/hand slot” positions measured dynamically from layout, or do you want fixed board coordinates?

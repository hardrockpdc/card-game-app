// Memory / Concentration — pure game logic (no React).
//
// Single-player: a grid of face-down cards laid out in pairs. Flip two; if the
// two cards are identical (same rank AND suit), they stay matched. If not, they
// flip back. Win when every pair is matched. Solo-only, cosmetic-economy
// friendly (a modest win reward via game/rewards.js under the id "memory").
//
// The board is built from real deck cards: we pick N distinct cards and place
// TWO copies of each, so a match is an exact same-card match — the clearest
// rule for younger players and it uses whatever card-deck theme is active.

import { createDeck, shuffleDeck } from "./deck";

// Board shapes. `cols` is fixed at 4 so the grid fits a portrait phone; the
// difficulty just adds rows (and therefore pairs).
export const DIFFICULTIES = {
  easy: { label: "Easy", cols: 4, rows: 3, pairs: 6 }, // 12 cards
  medium: { label: "Medium", cols: 4, rows: 4, pairs: 8 }, // 16 cards
  hard: { label: "Hard", cols: 4, rows: 6, pairs: 12 }, // 24 cards
};

export const DIFFICULTY_ORDER = ["easy", "medium", "hard"];

// Build a fresh game for the given difficulty (defaults to medium).
export function createGame(difficulty = "medium") {
  const shape = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const { cols, rows, pairs } = shape;

  // Pick `pairs` distinct cards, then make two copies of each.
  const chosen = shuffleDeck(createDeck()).slice(0, pairs);
  let cards = [];
  for (const c of chosen) {
    cards.push(makeBoardCard(c, "a"));
    cards.push(makeBoardCard(c, "b"));
  }
  cards = shuffleDeck(cards); // shuffleDeck is generic — shuffles any array

  return {
    difficulty,
    cols,
    rows,
    pairs,
    cards,
    flipped: [], // indices currently face up and not yet resolved (0, 1, or 2)
    moves: 0, // a "move" = a completed pair of flips
    matched: 0, // number of matched pairs
    status: "playing", // "playing" | "won"
    locked: false, // true while a mismatched pair is shown, waiting to flip back
  };
}

function makeBoardCard(card, copy) {
  return {
    id: `${card.id}-${copy}`, // unique key (two copies share rank/suit)
    rank: card.rank,
    suit: card.suit,
    faceUp: false,
    matched: false,
  };
}

// Flip the card at `index` face up and resolve a pair when two are up.
// Returns a new state; returns the SAME state (no-op) for illegal taps so the
// UI can call it freely.
export function flip(state, index) {
  if (state.status !== "playing" || state.locked) return state;

  const card = state.cards[index];
  if (!card || card.faceUp || card.matched) return state;

  const cards = state.cards.map((c, i) =>
    i === index ? { ...c, faceUp: true } : c,
  );
  const flipped = [...state.flipped, index];

  // First card of a pair — just show it.
  if (flipped.length < 2) {
    return { ...state, cards, flipped };
  }

  // Second card — count the move and check for a match.
  const [i1, i2] = flipped;
  const a = cards[i1];
  const b = cards[i2];
  const moves = state.moves + 1;
  const isMatch = a.rank === b.rank && a.suit === b.suit;

  if (isMatch) {
    const matchedCards = cards.map((c, i) =>
      i === i1 || i === i2 ? { ...c, matched: true } : c,
    );
    const matched = state.matched + 1;
    return {
      ...state,
      cards: matchedCards,
      flipped: [],
      moves,
      matched,
      status: matched === state.pairs ? "won" : "playing",
      locked: false,
    };
  }

  // Mismatch — leave both showing and lock the board until clearMismatch runs.
  return { ...state, cards, flipped, moves, locked: true };
}

// Flip a shown, mismatched pair back down. Call this after a short delay when
// state.locked is true. No-op if the board isn't locked.
export function clearMismatch(state) {
  if (!state.locked) return state;
  const [i1, i2] = state.flipped;
  const cards = state.cards.map((c, i) =>
    i === i1 || i === i2 ? { ...c, faceUp: false } : c,
  );
  return { ...state, cards, flipped: [], locked: false };
}

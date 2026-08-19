// This file handles creating and shuffling a deck of cards.

// The 4 suits in a standard deck. Exported so other game modules share this
// one definition instead of each keeping its own copy.
export const SUITS = ["♠", "♥", "♦", "♣"];

// The 13 ranks in a standard deck
export const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

// Blackjack scoring rules, named so the arithmetic below reads as rules
// rather than as bare numbers.
const FACE_RANKS = ["J", "Q", "K"];
const FACE_CARD_VALUE = 10;
const ACE_HIGH_VALUE = 11;
const ACE_LOW_VALUE = 1;
const BLACKJACK_TARGET = 21;

// Creates a fresh 52-card deck
// Each card is an object like { rank: 'A', suit: '♠', id: 'A♠' }
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        rank: rank,
        suit: suit,
        id: rank + suit, // unique id so React can track each card
      });
    }
  }
  return deck;
}

// Shuffles a deck (mixes the cards randomly)
export function shuffleDeck(deck) {
  const shuffled = [...deck]; // make a copy so we don't mess up the original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // swap two cards
  }
  return shuffled;
}

// Calculates the total value of a blackjack hand
// Handles Aces smartly: counts them as 11 unless that would bust you, then 1
export function calculateHandValue(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.rank === "A") {
      aces++;
      total += ACE_HIGH_VALUE;
    } else if (FACE_RANKS.includes(card.rank)) {
      total += FACE_CARD_VALUE;
    } else {
      total += parseInt(card.rank);
    }
  }

  // If we busted but have aces, convert them from 11 to 1 one at a time
  while (total > BLACKJACK_TARGET && aces > 0) {
    total -= ACE_HIGH_VALUE - ACE_LOW_VALUE;
    aces--;
  }

  return total;
}

// This file handles creating and shuffling a deck of cards.

// The 4 suits in a standard deck
const SUITS = ['♠', '♥', '♦', '♣'];

// The 13 ranks in a standard deck
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

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
    if (card.rank === 'A') {
      aces++;
      total += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }

  // If we busted but have aces, convert them from 11 to 1 one at a time
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}
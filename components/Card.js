import React from 'react';
import { Image, StyleSheet } from 'react-native';

// Maps deck rank/suit values → image filename keys
const RANK_KEY = { A: 'a', J: 'j', Q: 'q', K: 'k' };
const SUIT_KEY = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };

// Static require lookup — React Native requires literal paths at build time
const CARD_IMAGES = {
  'a_spades':    require('../assets/cards/a_spades.png'),
  'a_hearts':    require('../assets/cards/a_hearts.png'),
  'a_diamonds':  require('../assets/cards/a_diamonds.png'),
  'a_clubs':     require('../assets/cards/a_clubs.png'),
  '2_spades':    require('../assets/cards/2_spades.png'),
  '2_hearts':    require('../assets/cards/2_hearts.png'),
  '2_diamonds':  require('../assets/cards/2_diamonds.png'),
  '2_clubs':     require('../assets/cards/2_clubs.png'),
  '3_spades':    require('../assets/cards/3_spades.png'),
  '3_hearts':    require('../assets/cards/3_hearts.png'),
  '3_diamonds':  require('../assets/cards/3_diamonds.png'),
  '3_clubs':     require('../assets/cards/3_clubs.png'),
  '4_spades':    require('../assets/cards/4_spades.png'),
  '4_hearts':    require('../assets/cards/4_hearts.png'),
  '4_diamonds':  require('../assets/cards/4_diamonds.png'),
  '4_clubs':     require('../assets/cards/4_clubs.png'),
  '5_spades':    require('../assets/cards/5_spades.png'),
  '5_hearts':    require('../assets/cards/5_hearts.png'),
  '5_diamonds':  require('../assets/cards/5_diamonds.png'),
  '5_clubs':     require('../assets/cards/5_clubs.png'),
  '6_spades':    require('../assets/cards/6_spades.png'),
  '6_hearts':    require('../assets/cards/6_hearts.png'),
  '6_diamonds':  require('../assets/cards/6_diamonds.png'),
  '6_clubs':     require('../assets/cards/6_clubs.png'),
  '7_spades':    require('../assets/cards/7_spades.png'),
  '7_hearts':    require('../assets/cards/7_hearts.png'),
  '7_diamonds':  require('../assets/cards/7_diamonds.png'),
  '7_clubs':     require('../assets/cards/7_clubs.png'),
  '8_spades':    require('../assets/cards/8_spades.png'),
  '8_hearts':    require('../assets/cards/8_hearts.png'),
  '8_diamonds':  require('../assets/cards/8_diamonds.png'),
  '8_clubs':     require('../assets/cards/8_clubs.png'),
  '9_spades':    require('../assets/cards/9_spades.png'),
  '9_hearts':    require('../assets/cards/9_hearts.png'),
  '9_diamonds':  require('../assets/cards/9_diamonds.png'),
  '9_clubs':     require('../assets/cards/9_clubs.png'),
  '10_spades':   require('../assets/cards/10_spades.png'),
  '10_hearts':   require('../assets/cards/10_hearts.png'),
  '10_diamonds': require('../assets/cards/10_diamonds.png'),
  '10_clubs':    require('../assets/cards/10_clubs.png'),
  'j_spades':    require('../assets/cards/j_spades.png'),
  'j_hearts':    require('../assets/cards/j_hearts.png'),
  'j_diamonds':  require('../assets/cards/j_diamonds.png'),
  'j_clubs':     require('../assets/cards/j_clubs.png'),
  'q_spades':    require('../assets/cards/q_spades.png'),
  'q_hearts':    require('../assets/cards/q_hearts.png'),
  'q_diamonds':  require('../assets/cards/q_diamonds.png'),
  'q_clubs':     require('../assets/cards/q_clubs.png'),
  'k_spades':    require('../assets/cards/k_spades.png'),
  'k_hearts':    require('../assets/cards/k_hearts.png'),
  'k_diamonds':  require('../assets/cards/k_diamonds.png'),
  'k_clubs':     require('../assets/cards/k_clubs.png'),
  'card_back':   require('../assets/cards/card_back.png'),
};

export default function Card({ rank, suit, faceDown, small }) {
  const cardStyle = small ? styles.cardSmall : styles.card;

  if (faceDown) {
    return <Image source={CARD_IMAGES['card_back']} style={cardStyle} />;
  }

  const rankKey = RANK_KEY[rank] ?? String(rank).toLowerCase();
  const suitKey = SUIT_KEY[suit] ?? suit;
  const source = CARD_IMAGES[`${rankKey}_${suitKey}`];

  if (!source) return null;

  return <Image source={source} style={cardStyle} />;
}

const styles = StyleSheet.create({
  card: {
    width: 70,
    height: 100,
    margin: 4,
    borderRadius: 8,
  },
  cardSmall: {
    width: 42,
    height: 60,
    margin: 2,
    borderRadius: 5,
  },
});

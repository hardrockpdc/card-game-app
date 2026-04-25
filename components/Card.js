// A visual card component. Shows a playing card or a face-down card.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Card({ rank, suit, faceDown, small }) {
  const isRed = suit === '♥' || suit === '♦';
  const textColor = isRed ? '#d32f2f' : '#1a1a1a';
  const cardStyle = small ? styles.cardSmall : styles.card;

  if (faceDown) {
    return (
      <View style={[cardStyle, styles.faceDown]}>
        <Text style={small ? styles.faceDownTextSmall : styles.faceDownText}>🂠</Text>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <Text style={[small ? styles.rankSmall : styles.rank, { color: textColor }]}>{rank}</Text>
      <Text style={[small ? styles.suitSmall : styles.suit, { color: textColor }]}>{suit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 70,
    height: 100,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    margin: 4,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  cardSmall: {
    width: 42,
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 5,
    margin: 2,
    padding: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  faceDown: {
    backgroundColor: '#c0392b',
    justifyContent: 'center',
  },
  faceDownText: { fontSize: 40, color: '#ffffff' },
  faceDownTextSmall: { fontSize: 22, color: '#ffffff' },
  rank: { fontSize: 24, fontWeight: 'bold' },
  rankSmall: { fontSize: 14, fontWeight: 'bold' },
  suit: { fontSize: 32 },
  suitSmall: { fontSize: 18 },
});
// A visual card component. Shows a playing card or a face-down card.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Card({ rank, suit, faceDown }) {
  if (faceDown) {
    return (
      <View style={[styles.card, styles.faceDown]}>
        <Text style={styles.faceDownText}>🂠</Text>
      </View>
    );
  }

  // Red for hearts and diamonds, black for spades and clubs
  const isRed = suit === '♥' || suit === '♦';
  const textColor = isRed ? '#d32f2f' : '#1a1a1a';

  return (
    <View style={styles.card}>
      <Text style={[styles.rank, { color: textColor }]}>{rank}</Text>
      <Text style={[styles.suit, { color: textColor }]}>{suit}</Text>
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
  faceDown: {
    backgroundColor: '#c0392b',
    justifyContent: 'center',
  },
  faceDownText: {
    fontSize: 40,
    color: '#ffffff',
  },
  rank: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  suit: {
    fontSize: 32,
  },
});
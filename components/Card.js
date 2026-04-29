import React, { useState, useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { getCardImage, getCardBackImage, subscribe } from '../game/cardTheme';

export default function Card({ rank, suit, faceDown, small }) {
  // Re-render whenever the active theme changes
  const [, forceUpdate] = useState(0);
  useEffect(() => subscribe(() => forceUpdate(n => n + 1)), []);

  const source = faceDown ? getCardBackImage() : getCardImage(rank, suit);
  if (!source) return null;

  return <Image source={source} style={small ? styles.cardSmall : styles.card} />;
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

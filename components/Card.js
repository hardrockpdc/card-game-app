import React, { useState, useEffect } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { getCardImage, getCardBackImage, subscribe } from '../game/cardTheme';

const BASE_WIDTH = 390;

export default function Card({ rank, suit, faceDown, small }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => subscribe(() => forceUpdate(n => n + 1)), []);

  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.5);

  const source = faceDown ? getCardBackImage() : getCardImage(rank, suit);
  if (!source) return null;

  const w = Math.round((small ? 42 : 70) * scale);
  const h = Math.round((small ? 60 : 100) * scale);
  const m = Math.round((small ? 2 : 4) * scale);
  const r = Math.round((small ? 5 : 8) * scale);

  return (
    <Image
      source={source}
      style={{ width: w, height: h, margin: m, borderRadius: r }}
    />
  );
}

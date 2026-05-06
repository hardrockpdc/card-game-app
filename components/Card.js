import React, { useState, useEffect } from "react";
import { Image, useWindowDimensions } from "react-native";
import { getCardImage, getCardBackImage, subscribe } from "../game/cardTheme";

const BASE_WIDTH = 390;

export default function Card({
  rank,
  suit,
  faceDown,
  small = false,
  sizeScale = 1,
}) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribe(() => forceUpdate((n) => n + 1));
    return unsubscribe;
  }, []);

  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.5);

  const source = faceDown ? getCardBackImage() : getCardImage(rank, suit);
  if (!source) return null;

  const effectiveScale = scale * sizeScale;
  const w = Math.round((small ? 42 : 70) * effectiveScale);
  const h = Math.round((small ? 60 : 100) * effectiveScale);
  const m = Math.round((small ? 2 : 4) * effectiveScale);
  const r = Math.round((small ? 5 : 8) * effectiveScale);

  return (
    <Image
      source={source}
      style={{ width: w, height: h, margin: m, borderRadius: r }}
    />
  );
}

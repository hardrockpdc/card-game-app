import React, { useMemo } from "react";
import { Image, useWindowDimensions } from "react-native";
import { getCardImage, getCardBackImage } from "../game/cardTheme";
import { useTheme } from "../game/ThemeContext";

const BASE_WIDTH = 390;

function Card({ rank, suit, faceDown, small = false, sizeScale = 1 }) {
  // Subscribes this card to theme changes via context.
  // When the theme changes, ThemeProvider updates the context value,
  // which re-renders all Card instances so they pick up the new images.
  useTheme();

  const { width } = useWindowDimensions();

  // Memoize size calculations so they only recompute when dimensions or
  // the small/sizeScale props actually change.
  const { w, h, m, r } = useMemo(() => {
    const scale =
      Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.5) * sizeScale;
    return {
      w: Math.round((small ? 42 : 70) * scale),
      h: Math.round((small ? 60 : 100) * scale),
      m: Math.round((small ? 2 : 4) * scale),
      r: Math.round((small ? 5 : 8) * scale),
    };
  }, [width, small, sizeScale]);

  const source = faceDown ? getCardBackImage() : getCardImage(rank, suit);
  if (!source) return null;

  return (
    <Image
      source={source}
      style={{ width: w, height: h, margin: m, borderRadius: r }}
    />
  );
}

// React.memo: Card only re-renders when its props (rank, suit, faceDown,
// small, sizeScale) change. Parent game-screen re-renders (score updates,
// AI state, timers) are skipped if the card itself hasn't changed.
export default React.memo(Card);

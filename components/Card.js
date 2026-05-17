import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  AccessibilityInfo,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { getCardImage, getCardBackImage } from "../game/cardTheme";
import { useTheme } from "../game/ThemeContext";

const BASE_WIDTH = 390;
const FLIP_DURATION = 260;

function FlipCard({
  rank,
  suit,
  faceDown,
  w,
  h,
  m,
  r,
  backSource,
  frontSource,
  a11yLabel,
}) {
  // flipValue: 0 = back-facing (showing card_back), 1 = front-facing (showing rank/suit)
  const flipValue = useRef(new Animated.Value(faceDown ? 0 : 1)).current;
  const lastFaceDownRef = useRef(faceDown);

  const [reduceMotion, setReduceMotion] = useState(false);

  // Check reduced motion preference on mount; update if user changes it.
  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => setReduceMotion(enabled),
    );

    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  // When faceDown changes, run the flip animation (or snap if animation is off).
  useEffect(() => {
    const prev = lastFaceDownRef.current;
    lastFaceDownRef.current = faceDown;

    const target = faceDown ? 0 : 1;

    // If we don't want animations OR this is the first render OR reduced motion is on,
    // just snap to the target. This covers the common case: cards that never flip.
    if (reduceMotion || prev === faceDown) {
      flipValue.setValue(target);
      return;
    }

    // Locked-in rule: animate only for reveal (true -> false).
    if (!(prev === true && faceDown === false)) {
      flipValue.setValue(target);
      return;
    }

    // Run the flip
    Animated.timing(flipValue, {
      toValue: target,
      duration: FLIP_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [faceDown, reduceMotion, flipValue]);

  // Map flipValue [0..1] to the rotation of each face.
  // Back face rotates from 0deg (visible) to 180deg (hidden) as flipValue goes 0 -> 1.
  // Front face rotates from -180deg (hidden) to 0deg (visible) as flipValue goes 0 -> 1.
  const backRotation = flipValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const frontRotation = flipValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["-180deg", "0deg"],
  });

  return (
    <View
      style={{
        width: w,
        height: h,
        margin: m,
      }}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
    >
      <Animated.Image
        source={backSource}
        style={[
          styles.face,
          {
            width: w,
            height: h,
            borderRadius: r,
            transform: [{ perspective: 800 }, { rotateY: backRotation }],
          },
        ]}
      />
      <Animated.Image
        source={frontSource}
        style={[
          styles.face,
          {
            width: w,
            height: h,
            borderRadius: r,
            transform: [{ perspective: 800 }, { rotateY: frontRotation }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    backfaceVisibility: "hidden",
  },
});

export default function Card({
  rank,
  suit,
  faceDown = false,
  sizeScale = 1,
  small = false,
  animateReveal = false,
}) {
  // Subscribes this card to theme changes via context.
  // When the theme changes, ThemeProvider updates the context value,
  // which re-renders all Card instances so they pick up the new images.
  useTheme();

  const { width } = useWindowDimensions();

  // Memoize size calculations so they only recompute when dimensions or
  // the small/sizeScale props actually change.
  const { w, h, m, r } = useMemo(() => {
    const scale = Math.min(Math.max(width / BASE_WIDTH, 0.85), 1.5) * sizeScale;
    return {
      w: Math.round((small ? 42 : 70) * scale),
      h: Math.round((small ? 60 : 100) * scale),
      m: Math.round((small ? 2 : 4) * scale),
      r: Math.round((small ? 5 : 8) * scale),
    };
  }, [width, small, sizeScale]);

  const frontSource = getCardImage(rank, suit);
  const backSource = getCardBackImage();

  const a11yLabel = faceDown ? "Face down card" : `${rank} of ${suit}`;

  // Non-animated path: MUST remain visually identical to the old behavior.
  if (!animateReveal) {
    const source = faceDown ? backSource : frontSource;
    if (!source) return null;

    return (
      <Image
        source={source}
        style={{ width: w, height: h, margin: m, borderRadius: r }}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={a11yLabel}
      />
    );
  }

  if (!backSource || !frontSource) return null;

  return (
    <FlipCard
      rank={rank}
      suit={suit}
      faceDown={faceDown}
      w={w}
      h={h}
      m={m}
      r={r}
      backSource={backSource}
      frontSource={frontSource}
      a11yLabel={a11yLabel}
    />
  );
}

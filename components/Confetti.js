import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";

const COLORS = [
  "#e94560",
  "#ffd700",
  "#4caf50",
  "#7fb3ff",
  "#ce93d8",
  "#ff9800",
  "#26c6da",
];
const PIECE_COUNT = 42;

// A single falling confetti piece. Animates once on mount: drops down the
// screen with horizontal drift + spin, fading out near the bottom.
function Piece({ screenW, screenH, color }) {
  const t = useRef(new Animated.Value(0)).current;
  const cfg = useRef({
    left: Math.random() * screenW,
    width: 6 + Math.random() * 8,
    height: 8 + Math.random() * 8,
    delay: Math.random() * 450,
    duration: 1900 + Math.random() * 1600,
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() < 0.5 ? "-" : "") + (480 + Math.random() * 540) + "deg",
    rounded: Math.random() < 0.4,
  }).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: cfg.duration,
      delay: cfg.delay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [cfg.duration, cfg.delay, t]);

  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, screenH + 60],
  });
  const translateX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cfg.drift],
  });
  const rotate = t.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", cfg.spin],
  });
  const opacity = t.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: cfg.left,
        top: 0,
        width: cfg.width,
        height: cfg.height,
        backgroundColor: color,
        borderRadius: cfg.rounded ? cfg.width : 1,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

// Drop <Confetti active={won} /> as a top, non-interactive overlay. When
// `active` flips true it fires one celebratory burst. Honors reduced motion
// (renders nothing so the win is still shown by the modal, just without motion).
export default function Confetti({ active }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  if (!active || reduceMotion) {
    return null;
  }

  const { width, height } = Dimensions.get("window");

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer]}>
      {Array.from({ length: PIECE_COUNT }).map((_, i) => (
        <Piece
          key={i}
          screenW={width}
          screenH={height}
          color={COLORS[i % COLORS.length]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 100,
  },
});

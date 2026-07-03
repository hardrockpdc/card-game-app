import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet, AccessibilityInfo } from "react-native";
import { scale } from "../game/responsive";

// Subtle drifting card-suit glyphs used as a decorative backdrop (onboarding +
// Home). Muted tints so they read as texture on the dark #1a1a2e background,
// not decoration competing with the foreground. Reds for hearts/diamonds,
// blues for spades/clubs. Pure JS (RN core Animated, native driver) — no
// rebuild needed. Honors reduce-motion by leaving the glyphs static
// (CLAUDE.md 2.4).

const SUIT_RED = "#5e3a4a";
const SUIT_BLUE = "#33436b";

const FLOATERS = [
  { char: "♠", left: "8%", top: "10%", size: scale(52), color: SUIT_BLUE, dur: 4200, delay: 0, drift: -scale(34), opacity: 0.55 },
  { char: "♥", left: "72%", top: "14%", size: scale(40), color: SUIT_RED, dur: 5200, delay: 600, drift: scale(30), opacity: 0.5 },
  { char: "♦", left: "24%", top: "30%", size: scale(30), color: SUIT_RED, dur: 4600, delay: 1200, drift: -scale(26), opacity: 0.45 },
  { char: "♣", left: "84%", top: "42%", size: scale(46), color: SUIT_BLUE, dur: 5600, delay: 400, drift: scale(36), opacity: 0.5 },
  { char: "♦", left: "12%", top: "60%", size: scale(44), color: SUIT_RED, dur: 4800, delay: 900, drift: scale(32), opacity: 0.5 },
  { char: "♠", left: "68%", top: "70%", size: scale(34), color: SUIT_BLUE, dur: 5000, delay: 1500, drift: -scale(30), opacity: 0.45 },
  { char: "♣", left: "40%", top: "82%", size: scale(50), color: SUIT_BLUE, dur: 5400, delay: 200, drift: -scale(38), opacity: 0.5 },
  { char: "♥", left: "88%", top: "84%", size: scale(28), color: SUIT_RED, dur: 4400, delay: 1100, drift: scale(24), opacity: 0.45 },
];

export default function SuitBackground() {
  const animsRef = useRef(FLOATERS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let mounted = true;
    const loops = [];
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted || reduced) return; // reduced motion → leave values at 0 (static)
      animsRef.forEach((val, i) => {
        const f = FLOATERS[i];
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: 1, duration: f.dur, delay: f.delay, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: f.dur, useNativeDriver: true }),
          ]),
        );
        loops.push(loop);
        loop.start();
      });
    });
    return () => {
      mounted = false;
      loops.forEach((l) => l.stop());
      animsRef.forEach((v) => v.stopAnimation());
    };
  }, [animsRef]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {FLOATERS.map((f, i) => {
        const val = animsRef[i];
        const translateY = val.interpolate({ inputRange: [0, 1], outputRange: [0, f.drift] });
        const opacity = val.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [f.opacity * 0.55, f.opacity, f.opacity * 0.55],
        });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.floater,
              { left: f.left, top: f.top, fontSize: f.size, color: f.color, opacity, transform: [{ translateY }] },
            ]}
          >
            {f.char}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  floater: {
    position: "absolute",
    fontWeight: "700",
  },
});

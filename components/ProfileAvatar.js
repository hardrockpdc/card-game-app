import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAvatarChoice } from "../game/avatars";
import { getFrameRingStyle, getChipStyle } from "../game/frames";
import { useReduceMotion } from "../game/reduceMotion";

// Renders a player's profile picture consistently anywhere in the app:
//  - photoType "custom"  → the chosen/cropped image
//  - photoType "avatar"  → the preset emoji on its color
//  - otherwise           → the first letter of their name on a neutral circle
//
// Pass `profile` (with photoType/photoValue/name) and a pixel `size`. An unlocked
// profile `frame` — a ring (getFrameRingStyle) or a poker chip (getChipStyle)
// — is drawn around it, taken from `profile.activeFrame` unless a `frame`
// prop overrides it (used by the shop preview). "none"/unset renders exactly
// as before (no wrapper).
export default function ProfileAvatar({
  profile,
  size = 40,
  name,
  style,
  frame,
}) {
  const dim = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  let inner;
  if (profile?.photoType === "custom" && profile.photoValue) {
    inner = (
      <Image
        source={{ uri: profile.photoValue }}
        style={[styles.base, dim, style]}
      />
    );
  } else {
    const avatar =
      profile?.photoType === "avatar"
        ? getAvatarChoice(profile.photoValue)
        : null;
    if (avatar) {
      inner = (
        <View
          style={[styles.base, dim, { backgroundColor: avatar.color }, style]}
        >
          <Text style={{ fontSize: size * 0.55 }}>{avatar.emoji}</Text>
        </View>
      );
    } else {
      const initial =
        (name ?? profile?.name ?? "").trim().charAt(0).toUpperCase() || "?";
      inner = (
        <View style={[styles.base, dim, styles.fallback, style]}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: size * 0.42,
              fontWeight: "bold",
            }}
          >
            {initial}
          </Text>
        </View>
      );
    }
  }

  const frameId = frame ?? profile?.activeFrame ?? "none";

  const ring = getFrameRingStyle(frameId, size);
  if (ring) {
    return <View style={[styles.ring, ring]}>{inner}</View>;
  }

  const chip = getChipStyle(frameId, size);
  if (chip) {
    const body = (
      <View
        style={{
          shadowColor: chip.shadowColor,
          shadowOpacity: chip.shadowOpacity,
          shadowRadius: chip.shadowRadius,
          shadowOffset: chip.shadowOffset,
          elevation: chip.elevation,
        }}
      >
        <LinearGradient
          colors={chip.bodyGradient}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.9, y: 0.95 }}
          style={[
            styles.chipRing,
            {
              width: chip.chipSize,
              height: chip.chipSize,
              borderRadius: chip.chipSize / 2,
              borderColor: chip.edgeColor,
            },
          ]}
        >
          {chip.spots.map((spot, i) => (
            <View
              key={i}
              style={[
                styles.chipSpot,
                {
                  left: spot.left,
                  top: spot.top,
                  width: spot.width,
                  height: spot.height,
                  backgroundColor: chip.spotColor,
                  transform: [{ rotate: spot.rotate }],
                },
              ]}
            />
          ))}
          <View
            style={[
              styles.chipInlay,
              {
                width: chip.inlaySize,
                height: chip.inlaySize,
                borderRadius: chip.inlaySize / 2,
                backgroundColor: chip.inlayColor,
              },
            ]}
          >
            {inner}
          </View>
          {/* Glossy highlight — a fixed diagonal streak, clipped to the
              chip's circle by the gradient's own overflow:hidden. Not tied
              to the light color used for the bevel: this is meant to read
              as a reflection sitting ON TOP of the chip, independent of
              what color the chip itself is. */}
          <LinearGradient
            colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
            start={{ x: 0.1, y: 0.05 }}
            end={{ x: 0.55, y: 0.5 }}
            style={styles.chipGloss}
            pointerEvents="none"
          />
        </LinearGradient>
      </View>
    );
    return chip.pulse ? <PulseWrap>{body}</PulseWrap> : body;
  }

  return inner;
}

// Breathing scale for the top-tier chip (Purple). Snaps to the resting frame
// (no animation) when reduce-motion is on, matching Card.js's pattern.
function PulseWrap({ children }) {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallback: {
    backgroundColor: "#3a4456",
  },
  ring: {
    alignItems: "center",
    justifyContent: "center",
  },
  chipRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  chipInlay: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chipSpot: {
    position: "absolute",
    borderRadius: 1,
  },
  chipGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 9999,
  },
});

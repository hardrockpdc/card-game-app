import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { getAvatarChoice } from "../game/avatars";
import { getFrameRingStyle } from "../game/frames";
import { useReduceMotion } from "../game/reduceMotion";

// Renders a player's profile picture consistently anywhere in the app:
//  - photoType "custom"  → the chosen/cropped image
//  - photoType "avatar"  → the preset emoji on its color
//  - otherwise           → the first letter of their name on a neutral circle
//
// Pass `profile` (with photoType/photoValue/name) and a pixel `size`. An unlocked
// profile `frame` (a decorative ring) is drawn around it — taken from
// `profile.activeFrame` unless a `frame` prop overrides it (used by the shop
// preview). "none"/unset renders exactly as before (no wrapper).
//
// Optional `rank` ({ icon, threshold } from game/ranks.js) draws a small badge
// at the ring's corner once the player is past the free starting rank
// (threshold > 0). Omit `rank` anywhere the caller hasn't loaded lifetime
// earnings (e.g. lobby lists) — no badge renders, same as before.
export default function ProfileAvatar({
  profile,
  size = 40,
  name,
  style,
  frame,
  rank,
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
  const showBadge = Boolean(rank && rank.threshold > 0 && rank.icon);

  if (ring) {
    // Only View-style props go on the ring itself; style/pulse/innerRing/
    // pipGlyph/pipColor are metadata for this component, not RN style keys.
    const {
      style: ringKind,
      pulse,
      innerRing,
      pipGlyph,
      pipColor,
      pipSize,
      ...ringStyle
    } = ring;

    let framed = <View style={[styles.ring, ringStyle]}>{inner}</View>;

    if (innerRing) {
      framed = (
        <View style={[styles.ring, ringStyle]}>
          <View style={[styles.ring, innerRing]}>{inner}</View>
        </View>
      );
    }

    if (pulse) {
      framed = <PulseWrap>{framed}</PulseWrap>;
    }

    if (pipGlyph) {
      const badgeSize = Math.round(pipSize * 1.3);
      const pipBadgeStyle = [
        styles.pipBadge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          borderColor: pipColor,
        },
      ];
      framed = (
        <View style={styles.pipHost}>
          {framed}
          <View style={[pipBadgeStyle, styles.pipTL]}>
            <Text style={{ fontSize: pipSize, color: pipColor }}>
              {pipGlyph}
            </Text>
          </View>
          <View style={[pipBadgeStyle, styles.pipBR]}>
            <Text style={{ fontSize: pipSize, color: pipColor }}>
              {pipGlyph}
            </Text>
          </View>
        </View>
      );
    }

    if (!showBadge) return framed;
    return (
      <View style={styles.badgeHost}>
        {framed}
        <RankBadge rank={rank} size={size} />
      </View>
    );
  }

  if (!showBadge) return inner;
  return (
    <View style={styles.badgeHost}>
      {inner}
      <RankBadge rank={rank} size={size} />
    </View>
  );
}

// Breathing glow/scale for premium frames. Snaps to the resting frame (no
// animation) when reduce-motion is on, matching Card.js's pattern. The scale
// swing is deliberately large (1 → 1.15) — a subtle few-percent pulse reads
// as nothing at avatar sizes; this needs to be obvious at a glance, not just
// on close inspection.
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
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
  );
}

// Small rank-icon badge at the frame's bottom-right corner.
function RankBadge({ rank, size }) {
  const badgeSize = Math.max(14, Math.round(size * 0.34));
  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
        },
      ]}
    >
      <Text style={{ fontSize: badgeSize * 0.6 }}>{rank.icon}</Text>
    </View>
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
  pipHost: {
    alignItems: "center",
    justifyContent: "center",
  },
  pipBadge: {
    position: "absolute",
    backgroundColor: "#0F1B2D",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pipTL: {
    top: -3,
    left: -3,
  },
  pipBR: {
    bottom: -3,
    right: -3,
  },
  badgeHost: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#0F1B2D",
    borderWidth: 1.5,
    borderColor: "#243042",
    alignItems: "center",
    justifyContent: "center",
  },
});

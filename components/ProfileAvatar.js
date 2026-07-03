import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getAvatarChoice } from "../game/avatars";
import { getFrameRingStyle } from "../game/frames";

// Renders a player's profile picture consistently anywhere in the app:
//  - photoType "custom"  → the chosen/cropped image
//  - photoType "avatar"  → the preset emoji on its color
//  - otherwise           → the first letter of their name on a neutral circle
//
// Pass `profile` (with photoType/photoValue/name) and a pixel `size`. An unlocked
// profile `frame` (a decorative ring) is drawn around it — taken from
// `profile.activeFrame` unless a `frame` prop overrides it (used by the shop
// preview). "none"/unset renders exactly as before (no wrapper).
export default function ProfileAvatar({ profile, size = 40, name, style, frame }) {
  const dim = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  let inner;
  if (profile?.photoType === "custom" && profile.photoValue) {
    inner = (
      <Image source={{ uri: profile.photoValue }} style={[styles.base, dim, style]} />
    );
  } else {
    const avatar =
      profile?.photoType === "avatar"
        ? getAvatarChoice(profile.photoValue)
        : null;
    if (avatar) {
      inner = (
        <View style={[styles.base, dim, { backgroundColor: avatar.color }, style]}>
          <Text style={{ fontSize: size * 0.55 }}>{avatar.emoji}</Text>
        </View>
      );
    } else {
      const initial =
        (name ?? profile?.name ?? "").trim().charAt(0).toUpperCase() || "?";
      inner = (
        <View style={[styles.base, dim, styles.fallback, style]}>
          <Text
            style={{ color: "#ffffff", fontSize: size * 0.42, fontWeight: "bold" }}
          >
            {initial}
          </Text>
        </View>
      );
    }
  }

  const frameId = frame ?? profile?.activeFrame ?? "none";
  const ring = getFrameRingStyle(frameId, size);
  if (!ring) return inner;

  return <View style={[styles.ring, ring]}>{inner}</View>;
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
});

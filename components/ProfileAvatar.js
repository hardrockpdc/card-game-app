import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getAvatarChoice } from "../game/avatars";

// Renders a player's profile picture consistently anywhere in the app:
//  - photoType "custom"  → the chosen/cropped image
//  - photoType "avatar"  → the preset emoji on its color
//  - otherwise           → the first letter of their name on a neutral circle
//
// Pass `profile` (with photoType/photoValue/name) and a pixel `size`.
export default function ProfileAvatar({ profile, size = 40, name, style }) {
  const dim = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (profile?.photoType === "custom" && profile.photoValue) {
    return (
      <Image
        source={{ uri: profile.photoValue }}
        style={[styles.base, dim, style]}
      />
    );
  }

  const avatar =
    profile?.photoType === "avatar" ? getAvatarChoice(profile.photoValue) : null;
  if (avatar) {
    return (
      <View
        style={[styles.base, dim, { backgroundColor: avatar.color }, style]}
      >
        <Text style={{ fontSize: size * 0.55 }}>{avatar.emoji}</Text>
      </View>
    );
  }

  const initial =
    (name ?? profile?.name ?? "").trim().charAt(0).toUpperCase() || "?";
  return (
    <View style={[styles.base, dim, styles.fallback, style]}>
      <Text
        style={{ color: "#ffffff", fontSize: size * 0.42, fontWeight: "bold" }}
      >
        {initial}
      </Text>
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
});

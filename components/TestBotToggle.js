// components/TestBotToggle.js
// ─────────────────────────────────────────────────────────────────────────────
// Dev-only header toggle for the test bot. Renders nothing in production.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTestBot, IS_DEV } from "../game/testBot";
import { scale, scaleFont } from "../game/responsive";

export default function TestBotToggle() {
  const { enabled, setEnabled } = useTestBot();

  // Hide entirely in production builds.
  if (!IS_DEV) return null;

  return (
    <Pressable
      onPress={() => setEnabled(!enabled)}
      style={({ pressed }) => [
        styles.btn,
        enabled && styles.btnOn,
        pressed && styles.btnPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={enabled ? "Turn test bot off" : "Turn test bot on"}
    >
      <Text style={styles.text}>{enabled ? "🤖 ON" : "🤖 OFF"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(10),
    backgroundColor: "rgba(40, 40, 60, 0.9)",
    borderWidth: 1,
    borderColor: "#444",
  },
  btnOn: {
    backgroundColor: "#2d5a2d",
    borderColor: "#4ade80",
  },
  btnPressed: {
    opacity: 0.75,
  },
  text: {
    color: "#ffffff",
    fontSize: scaleFont(12),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});

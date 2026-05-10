import React from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { scale, scaleFont } from "../game/responsive";

export default function QuitButton({ onQuit }) {
  function handlePress() {
    Alert.alert("Quit Game?", "Your progress will be lost.", [
      { text: "Cancel", style: "cancel" },
      { text: "Quit", style: "destructive", onPress: onQuit },
    ]);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Quit game"
    >
      <Text style={styles.text}>✕ Quit</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: scale(50),
    right: scale(12),
    backgroundColor: "rgba(20,20,35,0.78)",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#444",
    paddingHorizontal: scale(11),
    paddingVertical: scale(6),
    zIndex: 99,
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    color: "#e0e0f0",
    fontSize: 13,
    fontWeight: "700",
  },
});

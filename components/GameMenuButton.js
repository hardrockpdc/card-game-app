import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { scale, scaleFont } from "../game/responsive";
import GameMenuItems from "./GameMenu";
import { HapticPressable } from "./Haptic";

// Self-contained hamburger button + dropdown, usable anywhere (not just the
// GameHeader bar). The menu opens in a Modal so it always renders above the
// board without zIndex/elevation fights with the cards below it.
export default function GameMenuButton({ menuItems, style }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={style}>
      <HapticPressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.btn,
          pressed && styles.btnPressed,
          open && styles.btnOpen,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open game menu"
      >
        <Text style={styles.btnText}>☰</Text>
      </HapticPressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        {/* Tapping the dimmed backdrop closes; the panel swallows its own taps */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={() => {}}>
            <GameMenuItems
              menuItems={menuItems}
              onClose={() => setOpen(false)}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: "rgba(20, 30, 55, 0.85)",
    borderWidth: 1,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnOpen: {
    borderColor: "#7FB3FF",
    backgroundColor: "rgba(30, 50, 90, 0.95)",
  },
  btnText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "900",
    lineHeight: scaleFont(20),
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: scale(54),
    paddingRight: scale(12),
  },
  panel: {
    minWidth: scale(220),
    backgroundColor: "#0F1B2D",
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#243042",
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
  },
});

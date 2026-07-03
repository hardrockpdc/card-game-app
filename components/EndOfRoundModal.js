import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { scale, scaleFont } from "../game/responsive";
import { HapticPressable as Pressable } from "./Haptic";

// Shared end-of-round / results modal used by every game so they all look
// identical: dark navy card, bold title, optional subtitle, an optional gold
// coin badge, a green primary action, and neutral outlined secondary actions.
// (Standardized to the Memory Match window on 2026-07-03.)
export default function EndOfRoundModal({
  visible,
  title,
  message,
  coins, // optional: shows a gold "+N 🪙" badge when > 0
  showAdjustBet,
  showContinue,
  showLeave,
  onContinue,
  onAdjustBet,
  onLeave,
  leaveLabel,
  tableColor, // accepted for backward compat; no longer themes the card
  isGameOver,
  continueLabel,
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!visible}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          {coins > 0 && (
            <Text style={styles.coins}>+{coins.toLocaleString()} 🪙</Text>
          )}

          <View style={styles.buttonCol}>
            {showContinue && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onContinue}
              >
                <Text style={styles.primaryBtnText}>
                  {continueLabel ?? (isGameOver ? "Play Again" : "Continue")}
                </Text>
              </Pressable>
            )}
            {showAdjustBet && (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onAdjustBet}
              >
                <Text style={styles.secondaryBtnText}>Adjust Bet</Text>
              </Pressable>
            )}
            {showLeave && (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onLeave}
              >
                <Text style={styles.secondaryBtnText}>
                  {leaveLabel ?? "Main Menu"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  box: {
    width: "100%",
    maxWidth: scale(360),
    backgroundColor: "#16213e",
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: "center",
    gap: scale(12),
  },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(24),
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    textAlign: "center",
    lineHeight: scaleFont(22),
  },
  coins: {
    color: "#ffd700",
    fontSize: scaleFont(20),
    fontWeight: "800",
    textAlign: "center",
  },
  buttonCol: {
    width: "100%",
    gap: scale(12),
    marginTop: scale(4),
  },
  primaryBtn: {
    backgroundColor: "#2e9e54",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: scaleFont(16),
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#334",
    paddingVertical: scale(14),
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
  btnPressed: {
    opacity: 0.8,
  },
});

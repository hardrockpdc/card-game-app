import React, { useCallback, useEffect, useMemo } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { scale, scaleFont } from "../game/responsive";
import {
  coinBadge,
  createPressGate,
  resolveCloseHandler,
} from "./endOfRoundLogic";
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
  onRequestClose, // optional: overrides what the Android Back button does
  leaveLabel,
  tableColor, // accepted for backward compat; no longer themes the card
  isGameOver,
  continueLabel,
}) {
  const gate = useMemo(() => createPressGate(), []);

  // A fresh showing of the modal always starts unlocked, even if the previous
  // one was dismissed mid-window.
  useEffect(() => {
    if (!visible) gate.reset();
  }, [visible, gate]);

  const once = useCallback(
    (fn) => {
      if (typeof fn !== "function") return undefined;
      return () => {
        if (gate.allow()) fn();
      };
    },
    [gate],
  );

  // RN's Modal needs a function here or Android Back silently does nothing.
  const handleRequestClose = useCallback(() => {
    const handler = resolveCloseHandler(onRequestClose, onLeave);
    if (handler) handler();
  }, [onRequestClose, onLeave]);

  const badge = coinBadge(coins);

  const continueText =
    continueLabel ?? (isGameOver ? "Play Again" : "Continue");
  const leaveText = leaveLabel ?? "Main Menu";

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!visible}
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.overlay}>
        {/* The card is capped and scrollable so the actions stay reachable when
            a long message meets a large system font scale. */}
        <ScrollView
          style={styles.boxScroll}
          contentContainerStyle={styles.box}
          bounces={false}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          {badge.show && (
            <Text
              style={styles.coins}
              accessibilityLabel={`Earned ${badge.amount.toLocaleString()} coins`}
            >
              {badge.text}
            </Text>
          )}

          <View style={styles.buttonCol}>
            {showContinue && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={once(onContinue)}
                accessibilityRole="button"
                accessibilityLabel={continueText}
              >
                <Text style={styles.primaryBtnText}>{continueText}</Text>
              </Pressable>
            )}
            {showAdjustBet && (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={once(onAdjustBet)}
                accessibilityRole="button"
                accessibilityLabel="Adjust Bet"
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
                onPress={once(onLeave)}
                accessibilityRole="button"
                accessibilityLabel={leaveText}
              >
                <Text style={styles.secondaryBtnText}>{leaveText}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
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
  // flexGrow: 0 keeps the ScrollView hugging its content instead of filling the
  // overlay; maxHeight is what actually caps it on a short screen.
  boxScroll: {
    width: "100%",
    maxWidth: scale(360),
    maxHeight: "100%",
    flexGrow: 0,
    backgroundColor: "#16213e",
    borderRadius: scale(16),
  },
  box: {
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
  // minHeight holds the Material 48 dp touch-target floor even when scale()
  // clamps down on a small phone.
  primaryBtn: {
    backgroundColor: "#2e9e54",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    minHeight: scale(48),
    alignItems: "center",
    justifyContent: "center",
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
    minHeight: scale(48),
    alignItems: "center",
    justifyContent: "center",
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

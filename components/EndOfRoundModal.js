import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { scale, scaleFont } from "../game/responsive";

export default function EndOfRoundModal({
  visible,
  title,
  message,
  showAdjustBet,
  showContinue,
  showLeave,
  onContinue,
  onAdjustBet,
  onLeave,
  leaveLabel,
  tableColor,
  isGameOver,
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!visible}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[styles.box, tableColor ? { borderColor: tableColor } : null]}
        >
          <View
            style={[
              styles.accentBar,
              { backgroundColor: tableColor ?? "#243042" },
            ]}
          />
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

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
                  {isGameOver ? "Play Again" : "Continue"}
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
                  styles.leaveBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onLeave}
              >
                <Text style={styles.leaveBtnText}>{leaveLabel ?? "Leave"}</Text>
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
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  box: {
    width: "100%",
    maxWidth: scale(360),
    backgroundColor: "#141c28",
    borderRadius: scale(22),
    borderWidth: 1.5,
    borderColor: "#243042",
    padding: scale(24),
    alignItems: "center",
    gap: scale(8),
  },
  accentBar: {
    width: "45%",
    height: scale(6),
    borderRadius: scale(3),
    alignSelf: "center",
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(28),
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: "#95a2b6",
    fontSize: scaleFont(16),
    textAlign: "center",
    lineHeight: scale(22),
  },
  buttonCol: {
    width: "100%",
    gap: scale(10),
    marginTop: scale(8),
  },
  primaryBtn: {
    backgroundColor: "#7fb3ff",
    borderRadius: scale(14),
    paddingVertical: scale(14),
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#08111f",
    fontSize: scaleFont(17),
    fontWeight: "900",
  },
  secondaryBtn: {
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    paddingVertical: scale(12),
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#c8d8f0",
    fontSize: scaleFont(15),
    fontWeight: "700",
  },
  leaveBtn: {
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: "#5a2020",
    paddingVertical: scale(12),
    alignItems: "center",
  },
  leaveBtnText: {
    color: "#c07070",
    fontSize: scaleFont(15),
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.8,
  },
});

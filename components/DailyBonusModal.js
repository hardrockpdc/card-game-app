import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { HapticTouchable as TouchableOpacity } from "./Haptic";
import { scale, scaleFont } from "../game/responsive";
import { DAILY_REWARDS, claimDailyBonus } from "../game/dailyBonus";
import { gold } from "../game/colors";

// Daily-bonus popup: shows the 7-day streak, highlights the day about to be
// claimed, and pays out on tap. Days 1–6 total 1,000; Day 7 is a 1,000 jackpot
// (2,000/week at a perfect streak). `claimDay` is which day (1..7) this claim
// counts as. onClaimed(result) fires after the coins land so the parent can
// refresh its balance.
export default function DailyBonusModal({
  visible,
  claimDay,
  onClose,
  onClaimed,
}) {
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    if (claiming) return;
    setClaiming(true);
    const result = await claimDailyBonus();
    setClaiming(false);
    if (result.claimed) {
      onClaimed && onClaimed(result);
    }
    // Claimed or already-claimed-elsewhere — either way, close.
    onClose && onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={45} tint="dark" style={styles.backdrop}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>Daily Bonus</Text>
          <Text style={styles.subtitle}>
            Log in every day to keep your streak going
          </Text>

          <View style={styles.daysRow}>
            {DAILY_REWARDS.map((amount, idx) => {
              const day = idx + 1;
              const isTarget = day === claimDay;
              const isJackpot = day === 7;
              return (
                <View
                  key={day}
                  style={[
                    styles.dayCell,
                    isJackpot && styles.dayCellJackpot,
                    isTarget && styles.dayCellTarget,
                  ]}
                >
                  <Text style={styles.dayLabel}>Day {day}</Text>
                  <Text
                    style={[
                      styles.dayAmount,
                      isJackpot && styles.dayAmountJackpot,
                    ]}
                  >
                    {isJackpot ? "🎁" : "🪙"}
                  </Text>
                  <Text
                    style={[
                      styles.dayAmount,
                      isJackpot && styles.dayAmountJackpot,
                    ]}
                  >
                    {amount}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.claimBtn}
            onPress={handleClaim}
            disabled={claiming}
            accessibilityRole="button"
            accessibilityLabel="Claim daily bonus"
          >
            {claiming ? (
              <ActivityIndicator color="#08111f" />
            ) : (
              <View style={styles.claimBtnRow}>
                <Text style={styles.claimBtnText}>
                  Claim {DAILY_REWARDS[(claimDay || 1) - 1]?.toLocaleString()}
                </Text>
                <Text style={styles.claimBtnText}>🪙</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Claim later"
          >
            <Text style={styles.laterText}>Later</Text>
          </TouchableOpacity>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const GOLD = gold;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // BlurView provides the frosted depth; this tint just keeps enough
    // contrast for the white panel text against a bright background photo.
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(20),
  },
  panel: {
    width: "100%",
    maxWidth: scale(440),
    backgroundColor: "#0F1B2D",
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "#243042",
    paddingHorizontal: scale(16),
    paddingVertical: scale(20),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(24),
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    textAlign: "center",
    marginTop: scale(4),
    marginBottom: scale(16),
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(6),
    marginBottom: scale(18),
  },
  dayCell: {
    width: scale(56),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#132234",
    paddingVertical: scale(8),
    alignItems: "center",
  },
  dayCellJackpot: {
    borderColor: GOLD,
    width: scale(74),
  },
  dayCellTarget: {
    borderColor: "#7fb3ff",
    borderWidth: 2,
    backgroundColor: "rgba(127,179,255,0.12)",
  },
  dayLabel: {
    color: "#9090a8",
    fontSize: scaleFont(11),
    fontWeight: "bold",
    marginBottom: scale(4),
  },
  dayAmount: {
    color: "#e8ecf5",
    fontSize: scaleFont(12),
    fontWeight: "bold",
    textAlign: "center",
  },
  dayAmountJackpot: {
    color: GOLD,
  },
  claimBtn: {
    backgroundColor: GOLD,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: "center",
  },
  // Icon + label as separate Text nodes (an emoji + text in ONE Text node can
  // render just the emoji on Android after a re-layout).
  claimBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  claimBtnText: {
    color: "#08111f",
    fontSize: scaleFont(17),
    fontWeight: "900",
  },
  laterBtn: {
    alignSelf: "center",
    paddingVertical: scale(12),
    marginTop: scale(6),
  },
  laterText: {
    color: "#9090a8",
    fontSize: scaleFont(14),
  },
});

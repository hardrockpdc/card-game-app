import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "./Haptic";
import { scale, scaleFont } from "../game/responsive";
import { DAILY_REWARDS, claimDailyBonus } from "../game/dailyBonus";

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
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(0);

  async function handleClaim() {
    if (claiming || done) return;
    setClaiming(true);
    const result = await claimDailyBonus();
    setClaiming(false);
    if (result.claimed) {
      setAwarded(result.amount);
      setDone(true);
      onClaimed && onClaimed(result);
    } else {
      // Already claimed elsewhere — just close.
      onClose && onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={done ? onClose : undefined}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <Text style={styles.title}>Daily Bonus</Text>
          <Text style={styles.subtitle}>
            {done
              ? "Nice — see you tomorrow!"
              : "Log in every day to keep your streak going"}
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
                    {"\n"}
                    {amount}
                  </Text>
                </View>
              );
            })}
          </View>

          {done ? (
            <View style={styles.claimedBox}>
              <Text style={styles.claimedText}>+{awarded.toLocaleString()} 🪙</Text>
            </View>
          ) : (
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
                <Text style={styles.claimBtnText}>
                  Claim {DAILY_REWARDS[(claimDay || 1) - 1]?.toLocaleString()} 🪙
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.laterBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={done ? "Close" : "Claim later"}
          >
            <Text style={styles.laterText}>{done ? "Close" : "Later"}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const GOLD = "#ffd479";

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
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
  claimBtnText: {
    color: "#08111f",
    fontSize: scaleFont(17),
    fontWeight: "900",
  },
  claimedBox: {
    backgroundColor: "#1a3a24",
    borderWidth: 1.5,
    borderColor: "#4caf50",
    borderRadius: scale(12),
    paddingVertical: scale(14),
    alignItems: "center",
  },
  claimedText: {
    color: "#7dff9e",
    fontSize: scaleFont(20),
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

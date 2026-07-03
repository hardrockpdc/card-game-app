import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { useFocusEffect } from "@react-navigation/native";
import { scale, scaleFont } from "../game/responsive";
import { listAchievements, checkAndClaim } from "../game/achievements";

// Trophy room. On focus it runs checkAndClaim() first (awards coins for anything
// newly earned since last visit), then lists every achievement grouped by
// category with a claimed ✓ / locked state.
export default function AchievementsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await checkAndClaim(); // sweep up anything newly earned
        const list = await listAchievements();
        if (active) {
          setItems(list);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const claimedCount = items.filter((a) => a.claimed).length;
  const earnedCoins = items
    .filter((a) => a.claimed)
    .reduce((sum, a) => sum + a.reward, 0);

  // Preserve the definition order but bucket by group.
  const groups = [];
  const byGroup = {};
  for (const a of items) {
    if (!byGroup[a.group]) {
      byGroup[a.group] = [];
      groups.push(a.group);
    }
    byGroup[a.group].push(a);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Achievements</Text>

        {loading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {claimedCount}/{items.length}
                </Text>
                <Text style={styles.summaryLabel}>Unlocked</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, styles.coinValue]}>
                  🪙 {earnedCoins.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Earned from Achievements</Text>
              </View>
            </View>

            {groups.map((group) => (
              <View key={group} style={styles.group}>
                <Text style={styles.groupHeader}>{group}</Text>
                {byGroup[group].map((a) => (
                  <View
                    key={a.id}
                    style={[styles.row, a.claimed && styles.rowClaimed]}
                  >
                    <Text
                      style={[styles.icon, !a.claimed && styles.iconLocked]}
                    >
                      {a.claimed ? a.icon : "🔒"}
                    </Text>
                    <View style={styles.rowText}>
                      <Text
                        style={[styles.name, !a.claimed && styles.nameLocked]}
                      >
                        {a.name}
                      </Text>
                      <Text style={styles.desc}>{a.desc}</Text>
                    </View>
                    <Text
                      style={[styles.reward, a.claimed && styles.rewardClaimed]}
                    >
                      {a.claimed ? "✓" : `+${a.reward.toLocaleString()}`}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: scale(24),
    paddingTop: scale(32),
  },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(28),
    fontWeight: "bold",
    marginBottom: scale(20),
  },
  loading: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    marginTop: scale(40),
  },
  summaryRow: {
    flexDirection: "row",
    gap: scale(12),
    width: "100%",
    maxWidth: 400,
    marginBottom: scale(24),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#2a2a4a",
    padding: scale(16),
    alignItems: "center",
  },
  summaryValue: {
    color: "#ffffff",
    fontSize: scaleFont(26),
    fontWeight: "bold",
    marginBottom: scale(4),
  },
  coinValue: {
    fontSize: scaleFont(20),
    color: "#ffd700",
  },
  summaryLabel: {
    color: "#888898",
    fontSize: scaleFont(11),
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  group: {
    width: "100%",
    maxWidth: 400,
    marginBottom: scale(18),
  },
  groupHeader: {
    color: "#888898",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: scale(8),
    marginLeft: scale(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16213e",
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "#2a2a4a",
    padding: scale(12),
    marginBottom: scale(8),
    gap: scale(12),
  },
  rowClaimed: {
    borderColor: "#3a5a3a",
    backgroundColor: "#152a1e",
  },
  icon: {
    fontSize: scaleFont(24),
    width: scale(34),
    textAlign: "center",
  },
  iconLocked: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
  },
  name: {
    color: "#ffffff",
    fontSize: scaleFont(15),
    fontWeight: "bold",
    marginBottom: scale(2),
  },
  nameLocked: {
    color: "#9aa0b4",
  },
  desc: {
    color: "#9090a8",
    fontSize: scaleFont(12),
  },
  reward: {
    color: "#ffd479",
    fontSize: scaleFont(14),
    fontWeight: "bold",
    minWidth: scale(50),
    textAlign: "right",
  },
  rewardClaimed: {
    color: "#4ade80",
    fontSize: scaleFont(18),
  },
  backBtn: {
    marginTop: scale(8),
    paddingVertical: scale(12),
    paddingHorizontal: scale(32),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#4a4a6a",
  },
  backBtnText: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
});

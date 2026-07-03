import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { scale, scaleFont } from "../game/responsive";
import { loadProfile } from "../game/profile";
import { getLifetimeEarned } from "../game/wallet";

const GAME_LABELS = {
  blackjack: "Blackjack",
  solitaire: "Solitaire",
  gofish: "Go Fish",
  lastcard: "Last Card",
  rummy: "Rummy",
  conquian: "Conquián",
  poker: "Poker",
  whoami: "Who Am I?",
};

export default function StatsScreen({ navigation }) {
  const [stats, setStats] = useState({});
  const [lifetime, setLifetime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profile, earned] = await Promise.all([
        loadProfile(),
        getLifetimeEarned(),
      ]);
      setStats(profile.stats || {});
      setLifetime(earned);
      setLoading(false);
    }
    load();
  }, []);

  const totalWins = Object.values(stats).reduce(
    (sum, entry) => sum + (entry?.wins ?? 0),
    0,
  );

  const gameRows = Object.entries(GAME_LABELS).map(([id, label]) => ({
    id,
    label,
    wins: stats[id]?.wins ?? 0,
  }));

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your Stats</Text>

        {loading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{totalWins}</Text>
                <Text style={styles.summaryLabel}>Total Wins</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, styles.coinValue]}>
                  🪙 {lifetime.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Coins Earned (lifetime)</Text>
              </View>
            </View>

            <View style={styles.table}>
              <Text style={styles.tableHeader}>Wins by Game</Text>
              {gameRows.map((row) => (
                <View key={row.id} style={styles.tableRow}>
                  <Text style={styles.gameLabel}>{row.label}</Text>
                  <Text
                    style={[
                      styles.winCount,
                      row.wins > 0 && styles.winCountActive,
                    ]}
                  >
                    {row.wins}
                  </Text>
                </View>
              ))}
            </View>

            {totalWins === 0 && (
              <Text style={styles.emptyHint}>
                Win a game to start tracking your stats!
              </Text>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
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
    marginBottom: scale(24),
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
    fontSize: scaleFont(28),
    fontWeight: "bold",
    marginBottom: scale(4),
  },
  coinValue: {
    fontSize: scaleFont(22),
    color: "#ffd700",
  },
  summaryLabel: {
    color: "#888898",
    fontSize: scaleFont(11),
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  table: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#2a2a4a",
    overflow: "hidden",
    marginBottom: scale(20),
  },
  tableHeader: {
    color: "#888898",
    fontSize: scaleFont(11),
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: scale(14),
    paddingBottom: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4a",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#22223a",
  },
  gameLabel: {
    color: "#c0c0d4",
    fontSize: scaleFont(15),
  },
  winCount: {
    color: "#9090a8",
    fontSize: scaleFont(16),
    fontWeight: "bold",
  },
  winCountActive: {
    color: "#4ade80",
  },
  emptyHint: {
    color: "#9090a8",
    fontSize: scaleFont(13),
    textAlign: "center",
    marginBottom: scale(16),
  },
  backBtn: {
    marginTop: scale(16),
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

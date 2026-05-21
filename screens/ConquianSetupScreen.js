import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResumePrompt } from "../game/useResumePrompt";
import { scale, scaleFont } from "../game/responsive";

function buildPlayers(playerName, aiCount) {
  return [
    { id: "host", name: playerName },
    ...Array.from({ length: aiCount }, (_, i) => ({
      id: `ai_${i + 1}`,
      name: aiCount > 1 ? `Computer ${i + 1}` : "Computer",
      isAI: true,
    })),
  ];
}

export default function ConquianSetupScreen({ navigation, route }) {
  const [aiCount, setAiCount] = useState(1);
  const params = route?.params ?? {};
  const launchParams =
    params.launchParams && typeof params.launchParams === "object"
      ? params.launchParams
      : {};

  const promptIfSaved = useResumePrompt();

  const handleStart = async () => {
    const playerName = launchParams.myName ?? "Player";
    const players = buildPlayers(playerName, aiCount);

    await promptIfSaved({
      saveKey: "@cardnight:save:conquian:default",
      gameName: "Conquián",
      onFresh: () =>
        navigation.navigate("ConquianGame", {
          ...launchParams,
          role: "singleplayer",
          myName: playerName,
          players,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("ConquianGame", {
          ...launchParams,
          role: "singleplayer",
          myName: playerName,
          players,
          resumeFromSave: true,
        }),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Conquián</Text>
        <Text style={styles.subtitle}>
          Classic Mexican rummy — be the first to meld your target and win.
        </Text>

        <View style={styles.panel}>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>AI Opponents</Text>
            <View style={styles.pillRow}>
              {[1, 2, 3].map((count) => {
                const selected = count === aiCount;
                return (
                  <Pressable
                    key={count}
                    onPress={() => setAiCount(count)}
                    style={({ pressed }) => [
                      styles.pill,
                      selected && styles.pillSelected,
                      pressed && styles.pillPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${count} ${
                      count === 1 ? "opponent" : "opponents"
                    }`}
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selected && styles.pillTextSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.constraintNote}>
              {aiCount === 1
                ? "2 players · 10 cards each · meld 11 to win"
                : aiCount === 2
                  ? "3 players · 8 cards each · meld 9 to win"
                  : "4 players · 7 cards each · meld 8 to win"}
            </Text>
          </View>

          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startBtn,
              pressed && styles.startBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start Game"
          >
            <Text style={styles.startBtnText}>Start Game</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#1a1a2e" },
  container: { padding: scale(20), alignItems: "stretch" },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(28),
    fontWeight: "bold",
    textAlign: "center",
    marginTop: scale(8),
  },
  subtitle: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    textAlign: "center",
    marginTop: scale(8),
    marginBottom: scale(20),
  },
  panel: {
    backgroundColor: "#16213e",
    borderRadius: scale(12),
    padding: scale(16),
  },
  sectionBlock: { marginVertical: scale(10) },
  sectionLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: scale(8),
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: scale(8) },
  pill: {
    backgroundColor: "#1a1a2e",
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  pillSelected: { backgroundColor: "#7fb3ff", borderColor: "#7fb3ff" },
  pillPressed: { opacity: 0.7 },
  pillText: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    fontWeight: "bold",
  },
  pillTextSelected: { color: "#0a0a1a" },
  constraintNote: {
    color: "#9090a8",
    fontSize: scaleFont(12),
    marginTop: scale(6),
    fontStyle: "italic",
  },
  startBtn: {
    backgroundColor: "#7fb3ff",
    paddingVertical: scale(14),
    borderRadius: scale(10),
    alignItems: "center",
    marginTop: scale(20),
  },
  startBtnPressed: { opacity: 0.85 },
  startBtnText: {
    color: "#0a0a1a",
    fontSize: scaleFont(16),
    fontWeight: "bold",
  },
});

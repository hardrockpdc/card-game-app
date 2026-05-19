import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResumePrompt } from "../game/useResumePrompt";
import { scale, scaleFont } from "../game/responsive";

function buildPlayers(playerName) {
  return [
    { id: "host", name: playerName },
    { id: "ai_1", name: "Computer", isAI: true },
  ];
}

export default function ConquianSetupScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const launchParams =
    params.launchParams && typeof params.launchParams === "object"
      ? params.launchParams
      : {};

  const [difficulty, setDifficulty] = useState("medium");
  const promptIfSaved = useResumePrompt();

  const handleStart = async () => {
    const playerName = launchParams.myName ?? "Player";
    const players = buildPlayers(playerName);

    await promptIfSaved({
      saveKey: "@cardnight:save:conquian:default",
      gameName: "Conquián",
      onFresh: () =>
        navigation.navigate("ConquianGame", {
          ...launchParams,
          role: "singleplayer",
          myName: playerName,
          players,
          difficulty,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("ConquianGame", {
          ...launchParams,
          role: "singleplayer",
          myName: playerName,
          players,
          difficulty,
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
          Classic Mexican rummy — meld 9 cards to win. 1v1 against the computer.
        </Text>

        <View style={styles.panel}>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>AI Opponents</Text>
            <View style={styles.pillRow}>
              <View style={[styles.pill, styles.pillSelected]}>
                <Text style={[styles.pillText, styles.pillTextSelected]}>
                  1
                </Text>
              </View>
            </View>
            <Text style={styles.constraintNote}>
              Conquián is 1v1 — only one opponent.
            </Text>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Difficulty</Text>
            <View style={styles.pillRow}>
              {[
                { id: "easy", label: "Easy" },
                { id: "medium", label: "Medium" },
                { id: "hard", label: "Hard" },
              ].map((option) => {
                const selected = option.id === difficulty;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => setDifficulty(option.id)}
                    style={({ pressed }) => [
                      styles.pill,
                      selected && styles.pillSelected,
                      pressed && styles.pillPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selected && styles.pillTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
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
  pillText: { color: "#c4c4d4", fontSize: scaleFont(14), fontWeight: "bold" },
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

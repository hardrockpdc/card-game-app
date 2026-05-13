import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResumePrompt } from "../game/useResumePrompt";
import { scale, scaleFont } from "../game/responsive";

const MODES = [
  {
    id: "free",
    emoji: "🎮",
    label: "Free Play",
    description:
      "Practice with play money. No coins wagered — play as long as you like.",
  },
  {
    id: "casino",
    emoji: "🪙",
    label: "Casino",
    description:
      "Wager your coin balance. Win big or bust — real stakes, real rewards.",
  },
];

export default function BlackjackModePickerScreen({ navigation }) {
  const [mode, setMode] = useState("casino");
  const promptIfSaved = useResumePrompt();

  const startGame = async () => {
    if (mode === "free") {
      navigation.navigate("Game", { mode: "free" });
      return;
    }
    await promptIfSaved({
      saveKey: "@cardnight:save:blackjack",
      gameName: "Blackjack",
      onFresh: () =>
        navigation.navigate("Game", { mode: "casino", resumeFromSave: false }),
      onResume: () =>
        navigation.navigate("Game", { mode: "casino", resumeFromSave: true }),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Blackjack</Text>
        <Text style={styles.subtitle}>
          Choose your mode, then start a hand.
        </Text>

        <View style={styles.panel}>
          <View style={styles.modeRow}>
            {MODES.map((m) => {
              const selected = m.id === mode;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMode(m.id)}
                  style={({ pressed }) => [
                    styles.modeCard,
                    selected && styles.modeCardSelected,
                    pressed && styles.modeCardPressed,
                  ]}
                >
                  <Text style={styles.modeEmoji}>{m.emoji}</Text>
                  <Text
                    style={[
                      styles.modeLabel,
                      selected && styles.modeLabelSelected,
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Text style={styles.modeDescription}>{m.description}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={startGame}
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
          >
            <Text style={styles.playButtonText}>Start Game</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  content: {
    padding: scale(18),
    gap: scale(14),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(34),
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#95a2b6",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
    textAlign: "center",
  },
  panel: {
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: scale(16),
    gap: scale(16),
  },
  modeRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  modeCard: {
    flex: 1,
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    padding: scale(14),
    gap: scale(6),
    alignItems: "center",
  },
  modeCardSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#1b2d47",
  },
  modeCardPressed: {
    opacity: 0.85,
  },
  modeEmoji: {
    fontSize: scaleFont(30),
  },
  modeLabel: {
    color: "#c8d8f0",
    fontSize: scaleFont(15),
    fontWeight: "800",
    textAlign: "center",
  },
  modeLabelSelected: {
    color: "#eef4ff",
  },
  modeDescription: {
    color: "#6a7d96",
    fontSize: scaleFont(12),
    textAlign: "center",
    lineHeight: scale(17),
  },
  playButton: {
    borderRadius: scale(16),
    backgroundColor: "#77aef7",
    alignItems: "center",
    paddingVertical: scale(14),
  },
  playButtonPressed: {
    opacity: 0.92,
  },
  playButtonText: {
    color: "#08111f",
    fontSize: scaleFont(16),
    fontWeight: "900",
  },
});

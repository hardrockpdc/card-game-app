import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResumePrompt } from "../game/useResumePrompt";
import { scale, scaleFont } from "../game/responsive";

const MODES = [
  {
    id: "free",
    label: "Free Play",
    description: "Practice mode. No coins won or lost.",
  },
  {
    id: "casino",
    label: "Casino",
    description: "Bet coins to win big payouts.",
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

        <View style={styles.panel}>
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
  panel: {
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: scale(16),
    gap: scale(10),
  },
  modeCard: {
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    gap: scale(4),
  },
  modeCardSelected: {
    borderColor: "#77aef7",
    backgroundColor: "rgba(119, 174, 247, 0.12)",
  },
  modeCardPressed: {
    opacity: 0.85,
  },
  modeLabel: {
    color: "#a7b3c9",
    fontSize: scaleFont(17),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  modeLabelSelected: {
    color: "#f4f7fb",
  },
  modeDescription: {
    color: "#6a7d96",
    fontSize: scaleFont(13),
    lineHeight: scale(18),
  },
  playButton: {
    marginTop: scale(6),
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

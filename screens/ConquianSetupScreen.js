import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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
      <View style={[styles.content, isLandscape && styles.contentLandscape]}>
        <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
          Conquián
        </Text>
        {!isLandscape ? (
          <Text style={styles.subtitle}>
            Classic Mexican rummy — be the first to meld your target and win.
          </Text>
        ) : null}

        <View style={[styles.panel, isLandscape && styles.panelLandscape]}>
          <View style={styles.paneStack}>
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
          </View>

          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start Game"
          >
            <Text style={styles.playButtonText}>Start Game</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  content: {
    flex: 1,
    padding: scale(14),
    gap: scale(10),
  },
  contentLandscape: {
    padding: scale(10),
    gap: scale(6),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(34),
    fontWeight: "900",
    textAlign: "center",
  },
  titleLandscape: {
    fontSize: scaleFont(22),
  },
  subtitle: {
    color: "#a8b5c8",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
    textAlign: "center",
  },
  panel: {
    flex: 1,
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: scale(14),
    gap: scale(12),
  },
  panelLandscape: {
    padding: scale(10),
    gap: scale(8),
  },
  paneStack: {
    flex: 1,
    gap: scale(12),
    justifyContent: "center",
  },
  sectionBlock: {
    gap: scale(8),
  },
  sectionLabel: {
    color: "#a8b5c8",
    fontSize: scaleFont(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  pillRow: {
    flexDirection: "row",
    gap: scale(8),
  },
  pill: {
    flex: 1,
    minHeight: scale(48),
    borderRadius: scale(999),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillText: {
    color: "#d3dcec",
    fontSize: scaleFont(14),
    fontWeight: "800",
  },
  pillTextSelected: {
    color: "#eef4ff",
  },
  constraintNote: {
    color: "#6a7d96",
    fontSize: scaleFont(12),
    marginTop: scale(2),
    textAlign: "center",
  },
  playButton: {
    borderRadius: scale(16),
    backgroundColor: "#77aef7",
    alignItems: "center",
    paddingVertical: scale(14),
    marginTop: scale(4),
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

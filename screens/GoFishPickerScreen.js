import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResumePrompt } from "../game/useResumePrompt";
import {
  getCachedProfile,
  getDisplayName,
  subscribeProfile,
} from "../game/profile";
import { scale, scaleFont } from "../game/responsive";
import VariantOptionGrid from "../components/VariantOptionGrid";

const GO_FISH_VARIANTS = [
  {
    id: "gofish",
    label: "Go Fish",
    description:
      "Ask opponents for cards to collect matching pairs. Most books wins.",
  },
];

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

export default function GoFishPickerScreen({ navigation }) {
  const [playerName, setPlayerName] = useState("Player");
  const [aiCount, setAiCount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const promptIfSaved = useResumePrompt();
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;

  useEffect(() => {
    let isMounted = true;
    const profile = getCachedProfile();
    if (isMounted) setPlayerName(getDisplayName(profile));

    const unsubscribe = subscribeProfile((p) => {
      if (isMounted) setPlayerName(getDisplayName(p));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const startGame = async () => {
    const players = buildPlayers(playerName, aiCount);
    await promptIfSaved({
      saveKey: "@cardnight:save:gofish",
      gameName: "Go Fish",
      onFresh: () =>
        navigation.navigate("GoFishGame", {
          role: "singleplayer",
          myName: playerName,
          players,
          difficulty,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("GoFishGame", {
          role: "singleplayer",
          myName: playerName,
          players,
          difficulty,
          resumeFromSave: true,
        }),
    });
  };

  const variantGrid = (
    <VariantOptionGrid
      value="gofish"
      onChange={() => {}}
      options={GO_FISH_VARIANTS}
      singleColumn={isLandscape}
    />
  );

  const controls = (
    <>
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>AI Opponents</Text>
        <View style={styles.pillRow}>
          {[1, 2, 3].map((count) => (
            <Pressable
              key={count}
              onPress={() => setAiCount(count)}
              style={({ pressed }) => [
                styles.pill,
                aiCount === count && styles.pillSelected,
                pressed && styles.pillPressed,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  aiCount === count && styles.pillTextSelected,
                ]}
              >
                {count}
              </Text>
            </Pressable>
          ))}
        </View>
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
              >
                <Text
                  style={[styles.pillText, selected && styles.pillTextSelected]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, isLandscape && styles.contentLandscape]}>
        <View style={[styles.panel, isLandscape && styles.panelLandscape]}>
          {isLandscape ? (
            <View style={styles.paneRow}>
              <View style={styles.pane}>{variantGrid}</View>
              <View style={styles.pane}>{controls}</View>
            </View>
          ) : (
            <View style={styles.paneStack}>
              {variantGrid}
              {controls}
            </View>
          )}

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
    justifyContent: "center",
  },
  contentLandscape: {
    padding: scale(10),
    gap: scale(6),
    justifyContent: "flex-start",
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
  paneRow: {
    flex: 1,
    flexDirection: "row",
    gap: scale(12),
  },
  pane: {
    flex: 1,
    gap: scale(10),
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

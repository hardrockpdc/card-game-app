import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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

const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildPlayers(playerName, aiCount) {
  return [
    { id: "host", name: playerName },
    ...Array.from({ length: aiCount }, (_, index) => ({
      id: `ai_${index + 1}`,
      name: aiCount > 1 ? `Computer ${index + 1}` : "Computer",
      isAI: true,
    })),
  ];
}

export default function GameSetupScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const {
    gameId = "goFish",
    gameName = "Game",
    screenName = "Game",
    aiRange = [1, 3],
    hasDifficulty = true,
  } = params;

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const [playerName, setPlayerName] = useState("Player");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [aiCount, setAiCount] = useState(() => aiRange[0] ?? 1);
  const [difficulty, setDifficulty] = useState("medium");

  useEffect(() => {
    let isMounted = true;

    function bootstrapProfile() {
      const profile = getCachedProfile();

      if (!isMounted) {
        return;
      }

      setPlayerName(getDisplayName(profile));
      setIsLoadingProfile(false);
    }

    bootstrapProfile();

    const unsubscribe = subscribeProfile((profile) => {
      setPlayerName(getDisplayName(profile));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const [minAI = 1, maxAI = 3] = aiRange;
    setAiCount((current) => clamp(current, minAI, maxAI));
  }, [aiRange]);

  const promptIfSaved = useResumePrompt();

  const [minAI, maxAI] = aiRange;
  const clampedAI = useMemo(
    () => clamp(aiCount, minAI, maxAI),
    [aiCount, minAI, maxAI],
  );
  const useStepper = maxAI > 3;
  const playTextSize = isSmallScreen ? 16 : 17;

  async function handlePlay() {
    const players = buildPlayers(playerName, clampedAI);
    const launchParams = {
      role: "singleplayer",
      myName: playerName,
      players,
      gameId,
      gameName,
      screenName,
    };

    if (hasDifficulty) {
      launchParams.difficulty = difficulty;
    }

    const saveKey =
      gameId === "goFish"
        ? "@cardnight:save:gofish"
        : "@cardnight:save:lastcard";

    await promptIfSaved({
      saveKey,
      gameName,
      onFresh: () =>
        navigation.navigate(screenName, {
          ...launchParams,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate(screenName, {
          ...launchParams,
          resumeFromSave: true,
        }),
    });
  }

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#e94560" size="large" />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.playerPill}>
          <Text style={styles.playerPillText}>Playing as {playerName}</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{gameName}</Text>
          <Text style={styles.subtitle}>
            Choose your computer opponents and difficulty before starting.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>
            {useStepper ? "Computer Opponents" : "Opponent Count"}
          </Text>

          {useStepper ? (
            <View style={styles.stepperRow}>
              <Pressable
                onPress={() =>
                  setAiCount((current) => clamp(current - 1, minAI, maxAI))
                }
                disabled={clampedAI <= minAI}
                style={({ pressed }) => [
                  styles.stepperButton,
                  clampedAI <= minAI && styles.disabledButton,
                  pressed && clampedAI > minAI && styles.buttonPressed,
                ]}
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>

              <View style={styles.stepperValueWrap}>
                <Text style={styles.stepperValue}>{clampedAI}</Text>
              </View>

              <Pressable
                onPress={() =>
                  setAiCount((current) => clamp(current + 1, minAI, maxAI))
                }
                disabled={clampedAI >= maxAI}
                style={({ pressed }) => [
                  styles.stepperButton,
                  clampedAI >= maxAI && styles.disabledButton,
                  pressed && clampedAI < maxAI && styles.buttonPressed,
                ]}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.countRow}>
              {[1, 2, 3]
                .filter((value) => value >= minAI && value <= maxAI)
                .map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setAiCount(value)}
                    style={({ pressed }) => [
                      styles.countButton,
                      clampedAI === value && styles.countButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countButtonText,
                        clampedAI === value && styles.countButtonTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
            </View>
          )}

          {hasDifficulty ? (
            <>
              <Text style={styles.sectionLabel}>Difficulty</Text>
              <View style={styles.difficultyRow}>
                {DIFFICULTIES.map((option) => {
                  const selected = option.id === difficulty;

                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setDifficulty(option.id)}
                      style={({ pressed }) => [
                        styles.difficultyButton,
                        selected && styles.difficultyButtonSelected,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.difficultyButtonText,
                          selected && styles.difficultyButtonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${gameName}`}
          onPress={handlePlay}
          style={({ pressed }) => [
            styles.playButton,
            pressed && styles.playButtonPressed,
          ]}
        >
          <Text style={[styles.playButtonText, { fontSize: playTextSize }]}>
            Play {gameName}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(24),
    backgroundColor: "#1a1a2e",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    color: "#b0b0c0",
    fontSize: scaleFont(15),
    marginTop: scale(12),
  },
  playerPill: {
    backgroundColor: "#16213e",
    borderRadius: scale(999),
    borderWidth: 1.5,
    borderColor: "#334",
    alignSelf: "center",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    marginBottom: scale(18),
  },
  playerPillText: {
    color: "#ffffff",
    fontSize: scaleFont(13),
    fontWeight: "bold",
  },
  header: {
    marginBottom: scale(20),
  },
  title: {
    color: "#f4f7fb",
    fontSize: scaleFont(30),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: scale(8),
    color: "#A7B3C9",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
  },
  panel: {
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: scale(16),
    gap: scale(16),
  },
  sectionLabel: {
    color: "#A7B3C9",
    fontSize: scaleFont(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  countRow: {
    flexDirection: "row",
    gap: scale(10),
  },
  countButton: {
    flex: 1,
    minHeight: scale(54),
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  countButtonSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  countButtonText: {
    color: "#d3dcec",
    fontSize: scaleFont(18),
    fontWeight: "800",
  },
  countButtonTextSelected: {
    color: "#eef4ff",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(16),
  },
  stepperButton: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: {
    color: "#eef4ff",
    fontSize: scaleFont(28),
    fontWeight: "900",
    marginTop: scale(-2),
  },
  stepperValueWrap: {
    minWidth: scale(52),
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: "#f4f7fb",
    fontSize: scaleFont(30),
    fontWeight: "900",
  },
  difficultyRow: {
    flexDirection: "row",
    gap: scale(8),
  },
  difficultyButton: {
    flex: 1,
    minHeight: scale(50),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  difficultyButtonSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  difficultyButtonText: {
    color: "#d3dcec",
    fontSize: scaleFont(12),
    fontWeight: "800",
  },
  difficultyButtonTextSelected: {
    color: "#eef4ff",
  },
  playButton: {
    marginTop: "auto",
    minHeight: scale(54),
    borderRadius: scale(18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C1121F",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  playButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  playButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  disabledButton: {
    opacity: 0.45,
  },
});

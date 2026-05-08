import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { hasSave, clearGame } from "../game/gameSaves";

import {
  getCachedProfile,
  getDisplayName,
  subscribeProfile,
} from "../game/profile";

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
      gameId === "goFish" ? "@cardnight:save:gofish" : "@cardnight:save:lastcard";

    const doNav = (resume) =>
      navigation.navigate(screenName, { ...launchParams, resumeFromSave: resume });

    const exists = await hasSave(saveKey);
    if (exists) {
      Alert.alert(
        "Game in Progress",
        `You have a saved ${gameName} game. Continue or start fresh?`,
        [
          {
            text: "Start New",
            style: "destructive",
            onPress: async () => { await clearGame(saveKey); doNav(false); },
          },
          { text: "Continue", onPress: () => doNav(true) },
        ],
      );
    } else {
      doNav(false);
    }
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
    fontSize: 15,
    marginTop: 12,
  },
  playerPill: {
    backgroundColor: "#16213e",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#334",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 18,
  },
  playerPillText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: "#f4f7fb",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    color: "#A7B3C9",
    fontSize: 15,
    lineHeight: 21,
  },
  panel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    padding: 16,
    gap: 16,
  },
  sectionLabel: {
    color: "#A7B3C9",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  countRow: {
    flexDirection: "row",
    gap: 10,
  },
  countButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
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
    fontSize: 18,
    fontWeight: "800",
  },
  countButtonTextSelected: {
    color: "#eef4ff",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  stepperButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: {
    color: "#eef4ff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: -2,
  },
  stepperValueWrap: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: "#f4f7fb",
    fontSize: 30,
    fontWeight: "900",
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
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
    fontSize: 12,
    fontWeight: "800",
  },
  difficultyButtonTextSelected: {
    color: "#eef4ff",
  },
  playButton: {
    marginTop: "auto",
    minHeight: 54,
    borderRadius: 18,
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

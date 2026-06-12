import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResumePrompt } from "../game/useResumePrompt";

import {
  getCachedProfile,
  getDisplayName,
  subscribeProfile,
} from "../game/profile";
import { scale, scaleFont } from "../game/responsive";
import GameSetupLayout, {
  OpponentStepper,
  DifficultyPills,
} from "../components/GameSetupLayout";

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

  const [playerName, setPlayerName] = useState("Player");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [aiCount, setAiCount] = useState(() => aiRange[0] ?? 1);
  const [difficulty, setDifficulty] = useState("medium");

  useEffect(() => {
    let isMounted = true;

    function bootstrapProfile() {
      const profile = getCachedProfile();
      if (!isMounted) return;
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

  const [minAI, maxAI] = aiRange;

  useEffect(() => {
    setAiCount((current) => clamp(current, minAI ?? 1, maxAI ?? 3));
  }, [minAI, maxAI]);

  const promptIfSaved = useResumePrompt();

  const clampedAI = useMemo(
    () => clamp(aiCount, minAI, maxAI),
    [aiCount, minAI, maxAI],
  );

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
          <ActivityIndicator color="#7fb3ff" size="large" />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GameSetupLayout
      title={gameName}
      subtitle="Choose your computer opponents and difficulty before starting."
      controls={
        <>
          <OpponentStepper
            value={clampedAI}
            min={minAI}
            max={maxAI}
            onChange={setAiCount}
          />
          {hasDifficulty ? (
            <DifficultyPills value={difficulty} onChange={setDifficulty} />
          ) : null}
        </>
      }
      onStart={handlePlay}
      startLabel="Start Game"
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f1115",
  },
  loadingText: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    marginTop: scale(12),
  },
});

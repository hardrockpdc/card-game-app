import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useHasSave } from "../game/useResumePrompt";
import { clearGame } from "../game/gameSaves";

import { POKER_VARIANT_OPTIONS } from "../components/PokerVariantWheel";
import VariantOptionGrid from "../components/VariantOptionGrid";
import GameSetupLayout, {
  OpponentStepper,
  DifficultyPills,
} from "../components/GameSetupLayout";
import {
  getCachedProfile,
  getDisplayName,
  subscribeProfile,
} from "../game/profile";

function getInitialVariant(currentVariant) {
  const found = POKER_VARIANT_OPTIONS.find(
    (option) => option.value === currentVariant,
  );
  return found ? found.value : POKER_VARIANT_OPTIONS[0].value;
}

function getModeCopy(mode) {
  if (mode === "lobby") {
    return {
      title: "Lobby Poker Variant",
      subtitle: "Choose the poker variant you want to send back to the lobby.",
      buttonLabel: "Save Variant",
    };
  }
  return {
    title: "Poker",
    subtitle: "Pick a variant, then start a new game.",
    buttonLabel: "Start Game",
  };
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

function PokerVariantPickerScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const { mode = "singleplayer", currentVariant, launchParams } = params;
  const isLobby = mode === "lobby";

  const [playerName, setPlayerName] = useState("Player");
  const [selectedVariant, setSelectedVariant] = useState(() =>
    getInitialVariant(currentVariant),
  );
  const [aiCount, setAiCount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const saveKey = `@cardnight:save:poker:${selectedVariant}`;
  const hasSavedGame = useHasSave(saveKey);

  useEffect(() => {
    setSelectedVariant(getInitialVariant(currentVariant));
  }, [currentVariant]);

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

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const modeCopy = useMemo(() => getModeCopy(mode), [mode]);

  const saveToLobby = () =>
    navigation.navigate({
      name: "Lobby",
      params: { selectedPokerVariant: selectedVariant },
      merge: true,
    });

  const goGame = (resumeFromSave) => {
    const launchPayload =
      launchParams && typeof launchParams === "object" ? launchParams : {};
    navigation.navigate("PokerGame", {
      ...launchPayload,
      role: "singleplayer",
      myName: launchPayload.myName ?? playerName,
      players: buildPlayers(launchPayload.myName ?? playerName, aiCount),
      difficulty,
      variant: selectedVariant,
      resumeFromSave,
    });
  };
  const goFresh = () => goGame(false);
  const goResume = () => goGame(true);
  const startNew = async () => {
    await clearGame(saveKey);
    goFresh();
  };

  const onStart = isLobby ? saveToLobby : goFresh;

  return (
    <GameSetupLayout
      title={modeCopy.title}
      subtitle={modeCopy.subtitle}
      variantSlot={
        <VariantOptionGrid
          value={selectedVariant}
          onChange={setSelectedVariant}
          options={POKER_VARIANT_OPTIONS}
          singleColumn={isLandscape}
        />
      }
      controls={
        isLobby ? null : (
          <>
            <OpponentStepper
              value={aiCount}
              min={1}
              max={3}
              onChange={setAiCount}
            />
            <DifficultyPills value={difficulty} onChange={setDifficulty} />
          </>
        )
      }
      onStart={onStart}
      startLabel={modeCopy.buttonLabel}
      resume={
        !isLobby && hasSavedGame
          ? { onContinue: goResume, onStartNew: startNew }
          : null
      }
    />
  );
}

export default PokerVariantPickerScreen;

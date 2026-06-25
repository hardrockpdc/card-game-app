import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useHasSave } from "../game/useResumePrompt";
import { clearGame } from "../game/gameSaves";

import VariantOptionGrid from "../components/VariantOptionGrid";
import GameSetupLayout, {
  OpponentStepper,
  DifficultyPills,
} from "../components/GameSetupLayout";
import { RUMMY_VARIANT_OPTIONS } from "../game/rummy";

function getInitialVariant(currentVariant, options) {
  const found = options.find((option) => option.value === currentVariant);
  return found ? found.value : options[0].value;
}

function getModeCopy(mode) {
  if (mode === "lobby") {
    return {
      title: "Lobby Rummy Variant",
      subtitle: "Choose the rules you want to send back to the lobby.",
      buttonLabel: "Save Variant",
    };
  }
  return {
    title: "",
    subtitle: "",
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

function RummyVariantPickerScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const { mode = "singleplayer", currentVariant, launchParams } = params;
  const pickerOptions = RUMMY_VARIANT_OPTIONS;
  const isSinglePlayer = mode !== "lobby";

  const [selectedVariant, setSelectedVariant] = useState(() =>
    getInitialVariant(currentVariant, pickerOptions),
  );
  const [aiCount, setAiCount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const saveKey = `@cardnight:save:rummy:${selectedVariant}`;
  const hasSavedGame = useHasSave(saveKey);

  useEffect(() => {
    setSelectedVariant(getInitialVariant(currentVariant, pickerOptions));
  }, [currentVariant, pickerOptions]);

  const modeCopy = useMemo(() => getModeCopy(mode), [mode]);

  // Lobby mode: just hand the chosen variant back to the lobby (no save).
  const saveToLobby = () =>
    navigation.navigate({
      name: "Lobby",
      params: {
        ...(launchParams && typeof launchParams === "object" ? launchParams : {}),
        selectedRummyVariant: selectedVariant,
      },
      merge: true,
    });

  const goGame = (resumeFromSave) => {
    const launchPayload =
      launchParams && typeof launchParams === "object" ? launchParams : {};
    const playerName = launchPayload.myName ?? "Player";
    navigation.navigate("RummyGame", {
      ...launchPayload,
      players: buildPlayers(playerName, aiCount),
      difficulty,
      variantId: selectedVariant,
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

  const onStart = isSinglePlayer ? goFresh : saveToLobby;

  return (
    <GameSetupLayout
      title={modeCopy.title}
      subtitle={modeCopy.subtitle}
      variantSlot={
        <VariantOptionGrid
          value={selectedVariant}
          onChange={setSelectedVariant}
          options={pickerOptions}
          singleColumn={isLandscape}
          fill
        />
      }
      controls={
        isSinglePlayer ? (
          <>
            <OpponentStepper
              value={aiCount}
              min={1}
              max={3}
              onChange={setAiCount}
            />
            <DifficultyPills value={difficulty} onChange={setDifficulty} />
          </>
        ) : null
      }
      onStart={onStart}
      startLabel={modeCopy.buttonLabel}
      resume={
        isSinglePlayer && hasSavedGame
          ? { onContinue: goResume, onStartNew: startNew }
          : null
      }
    />
  );
}

export default RummyVariantPickerScreen;

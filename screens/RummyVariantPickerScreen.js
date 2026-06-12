import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useResumePrompt } from "../game/useResumePrompt";

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
    title: "Rummy",
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
  const promptIfSaved = useResumePrompt();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  useEffect(() => {
    setSelectedVariant(getInitialVariant(currentVariant, pickerOptions));
  }, [currentVariant, pickerOptions]);

  const modeCopy = useMemo(() => getModeCopy(mode), [mode]);

  const handleContinue = async () => {
    if (mode === "lobby") {
      navigation.navigate({
        name: "Lobby",
        params: { selectedRummyVariant: selectedVariant },
        merge: true,
      });
      return;
    }

    const launchPayload =
      launchParams && typeof launchParams === "object" ? launchParams : {};
    const playerName = launchPayload.myName ?? "Player";
    const players = buildPlayers(playerName, aiCount);
    const variantLabel =
      RUMMY_VARIANT_OPTIONS.find((o) => o.value === selectedVariant)?.label ??
      "Rummy";

    await promptIfSaved({
      saveKey: `@cardnight:save:rummy:${selectedVariant}`,
      gameName: variantLabel,
      onFresh: () =>
        navigation.navigate("RummyGame", {
          ...launchPayload,
          players,
          difficulty,
          variantId: selectedVariant,
          variant: selectedVariant,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("RummyGame", {
          ...launchPayload,
          players,
          difficulty,
          variantId: selectedVariant,
          variant: selectedVariant,
          resumeFromSave: true,
        }),
    });
  };

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
      onStart={handleContinue}
      startLabel={modeCopy.buttonLabel}
    />
  );
}

export default RummyVariantPickerScreen;

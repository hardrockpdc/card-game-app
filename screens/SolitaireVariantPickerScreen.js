import React, { useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { SPIDER_MODE_OPTIONS, VARIANT_OPTIONS } from "../game/solitaire";
import { useResumePrompt } from "../game/useResumePrompt";
import VariantOptionGrid from "../components/VariantOptionGrid";
import GameSetupLayout, {
  SetupSection,
  PillRow,
} from "../components/GameSetupLayout";

export default function SolitaireVariantPickerScreen({ navigation, route }) {
  const initialVariantId = route?.params?.variantId || VARIANT_OPTIONS[0].id;
  const [variantId, setVariantId] = useState(initialVariantId);
  const [spiderMode, setSpiderMode] = useState(4);
  const promptIfSaved = useResumePrompt();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const selectedVariant = useMemo(
    () =>
      VARIANT_OPTIONS.find((option) => option.id === variantId) ||
      VARIANT_OPTIONS[0],
    [variantId],
  );

  const startGame = async () => {
    const navParams = {
      variantId,
      spiderMode: variantId === "spider" ? spiderMode : undefined,
    };
    await promptIfSaved({
      saveKey: `@cardnight:save:solitaire:${variantId}`,
      gameName: selectedVariant.label,
      onFresh: () =>
        navigation.navigate("SolitaireGame", {
          ...navParams,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("SolitaireGame", {
          ...navParams,
          resumeFromSave: true,
        }),
    });
  };

  return (
    <GameSetupLayout
      title="Solitaire"
      subtitle="Pick a mode, then start a new game."
      variantSlot={
        <>
          <VariantOptionGrid
            value={variantId}
            onChange={setVariantId}
            options={VARIANT_OPTIONS}
            singleColumn={isLandscape}
          />
          {variantId === "spider" ? (
            <SetupSection label="Spider suits">
              <PillRow
                value={spiderMode}
                onChange={setSpiderMode}
                options={SPIDER_MODE_OPTIONS}
              />
            </SetupSection>
          ) : null}
        </>
      }
      onStart={startGame}
      startLabel="Start Game"
    />
  );
}

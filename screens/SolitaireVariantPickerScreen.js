import React, { useState } from "react";
import { useWindowDimensions } from "react-native";

import { SPIDER_MODE_OPTIONS, VARIANT_OPTIONS } from "../game/solitaire";
import { useHasSave } from "../game/useResumePrompt";
import { clearGame } from "../game/gameSaves";
import VariantOptionGrid from "../components/VariantOptionGrid";
import GameSetupLayout, {
  SetupSection,
  PillRow,
} from "../components/GameSetupLayout";

export default function SolitaireVariantPickerScreen({ navigation, route }) {
  const initialVariantId = route?.params?.variantId || VARIANT_OPTIONS[0].id;
  const [variantId, setVariantId] = useState(initialVariantId);
  const [spiderMode, setSpiderMode] = useState(4);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const saveKey = `@cardnight:save:solitaire:${variantId}`;
  const hasSavedGame = useHasSave(saveKey);

  const navParams = () => ({
    variantId,
    spiderMode: variantId === "spider" ? spiderMode : undefined,
  });
  const goFresh = () =>
    navigation.navigate("SolitaireGame", {
      ...navParams(),
      resumeFromSave: false,
    });
  const goResume = () =>
    navigation.navigate("SolitaireGame", {
      ...navParams(),
      resumeFromSave: true,
    });
  const startNew = async () => {
    await clearGame(saveKey);
    goFresh();
  };

  return (
    <GameSetupLayout
      title=""
      subtitle=""
      variantSlot={
        <>
          <VariantOptionGrid
            value={variantId}
            onChange={setVariantId}
            options={VARIANT_OPTIONS}
            singleColumn={isLandscape}
            fill
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
      onStart={goFresh}
      startLabel="Start Game"
      resume={
        hasSavedGame ? { onContinue: goResume, onStartNew: startNew } : null
      }
    />
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useResumePrompt } from "../game/useResumePrompt";

import { POKER_VARIANT_OPTIONS } from "../components/PokerVariantWheel";
import VariantOptionGrid from "../components/VariantOptionGrid";
import GameSetupLayout, {
  OpponentStepper,
  DifficultyPills,
  SetupSection,
  PillRow,
  SetupNote,
} from "../components/GameSetupLayout";
import {
  getCachedProfile,
  getDisplayName,
  subscribeProfile,
} from "../game/profile";
import { getCoins } from "../game/wallet";

const BUY_INS = [100, 250, 500, 1000];

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
  const [coins, setCoins] = useState(null);
  const [buyIn, setBuyIn] = useState(100);
  const promptIfSaved = useResumePrompt();

  // Refresh wallet balance each time this screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      getCoins().then((c) => {
        setCoins(c);
        setBuyIn((prev) => (c >= prev ? prev : 100));
      });
    }, []),
  );

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
  const coinsLoaded = coins !== null;
  const canAffordMin = !coinsLoaded || coins >= 100;
  const canPlay = isLobby || canAffordMin;

  const handleContinue = async () => {
    if (isLobby) {
      navigation.navigate({
        name: "Lobby",
        params: { selectedPokerVariant: selectedVariant },
        merge: true,
      });
      return;
    }

    const launchPayload =
      launchParams && typeof launchParams === "object" ? launchParams : {};
    const players = buildPlayers(launchPayload.myName ?? playerName, aiCount);
    const variantLabel =
      POKER_VARIANT_OPTIONS.find((o) => o.value === selectedVariant)?.label ??
      "Poker";
    const navParams = {
      ...launchPayload,
      role: "singleplayer",
      myName: launchPayload.myName ?? playerName,
      players,
      difficulty,
      variant: selectedVariant,
      buyIn,
    };
    await promptIfSaved({
      saveKey: `@cardnight:save:poker:${selectedVariant}`,
      gameName: variantLabel,
      onFresh: () =>
        navigation.navigate("PokerGame", { ...navParams, resumeFromSave: false }),
      onResume: () =>
        navigation.navigate("PokerGame", { ...navParams, resumeFromSave: true }),
      extraMessage: "Note: starting fresh will use a new buy-in.",
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
            <SetupSection label="Buy-In">
              <PillRow
                value={buyIn}
                onChange={setBuyIn}
                options={BUY_INS.map((amount) => ({
                  value: amount,
                  label: String(amount),
                  disabled: coinsLoaded && coins < amount,
                }))}
              />
              {coinsLoaded ? (
                <SetupNote>
                  {coins < 100
                    ? "You need at least 🪙 100 to play. Visit your Profile to reset coins."
                    : `Balance: 🪙 ${coins.toLocaleString()}`}
                </SetupNote>
              ) : null}
            </SetupSection>
          </>
        )
      }
      onStart={handleContinue}
      startLabel={modeCopy.buttonLabel}
      startDisabled={!canPlay}
    />
  );
}

export default PokerVariantPickerScreen;

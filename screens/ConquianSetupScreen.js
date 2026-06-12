import React, { useState } from "react";
import { useResumePrompt } from "../game/useResumePrompt";
import GameSetupLayout, {
  OpponentStepper,
  SetupNote,
} from "../components/GameSetupLayout";

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

const NOTES = {
  1: "2 players · 10 cards each · meld 11 to win",
  2: "3 players · 8 cards each · meld 9 to win",
  3: "4 players · 7 cards each · meld 8 to win",
};

export default function ConquianSetupScreen({ navigation, route }) {
  const [aiCount, setAiCount] = useState(1);
  const params = route?.params ?? {};
  const launchParams =
    params.launchParams && typeof params.launchParams === "object"
      ? params.launchParams
      : {};

  const promptIfSaved = useResumePrompt();

  const handleStart = async () => {
    const playerName = launchParams.myName ?? "Player";
    const players = buildPlayers(playerName, aiCount);

    await promptIfSaved({
      saveKey: "@cardnight:save:conquian:default",
      gameName: "Conquián",
      onFresh: () =>
        navigation.navigate("ConquianGame", {
          ...launchParams,
          role: "singleplayer",
          myName: playerName,
          players,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("ConquianGame", {
          ...launchParams,
          role: "singleplayer",
          myName: playerName,
          players,
          resumeFromSave: true,
        }),
    });
  };

  return (
    <GameSetupLayout
      title="Conquián"
      subtitle="Classic Mexican rummy — be the first to meld your target and win."
      controls={
        <>
          <OpponentStepper
            value={aiCount}
            min={1}
            max={3}
            onChange={setAiCount}
          />
          <SetupNote>{NOTES[aiCount]}</SetupNote>
        </>
      }
      onStart={handleStart}
      startLabel="Start Game"
    />
  );
}

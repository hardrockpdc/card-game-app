import React, { useState } from "react";
import { useHasSave } from "../game/useResumePrompt";
import { clearGame } from "../game/gameSaves";
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

  const saveKey = "@cardnight:save:conquian:default";
  const hasSavedGame = useHasSave(saveKey);

  const go = (resumeFromSave) => {
    const playerName = launchParams.myName ?? "Player";
    navigation.navigate("ConquianGame", {
      ...launchParams,
      role: "singleplayer",
      myName: playerName,
      players: buildPlayers(playerName, aiCount),
      resumeFromSave,
    });
  };
  const goFresh = () => go(false);
  const goResume = () => go(true);
  const startNew = async () => {
    await clearGame(saveKey);
    goFresh();
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
      onStart={goFresh}
      startLabel="Start Game"
      resume={
        hasSavedGame ? { onContinue: goResume, onStartNew: startNew } : null
      }
    />
  );
}

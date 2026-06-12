import React, { useEffect, useState } from "react";
import { useResumePrompt } from "../game/useResumePrompt";
import {
  getCachedProfile,
  getDisplayName,
  subscribeProfile,
} from "../game/profile";
import GameSetupLayout, {
  OpponentStepper,
  DifficultyPills,
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

export default function GoFishPickerScreen({ navigation }) {
  const [playerName, setPlayerName] = useState("Player");
  const [aiCount, setAiCount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const promptIfSaved = useResumePrompt();

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

  const startGame = async () => {
    const players = buildPlayers(playerName, aiCount);
    await promptIfSaved({
      saveKey: "@cardnight:save:gofish",
      gameName: "Go Fish",
      onFresh: () =>
        navigation.navigate("GoFishGame", {
          role: "singleplayer",
          myName: playerName,
          players,
          difficulty,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("GoFishGame", {
          role: "singleplayer",
          myName: playerName,
          players,
          difficulty,
          resumeFromSave: true,
        }),
    });
  };

  return (
    <GameSetupLayout
      title="Go Fish"
      subtitle="Ask opponents for cards to collect matching books. Most books wins."
      controls={
        <>
          <OpponentStepper
            value={aiCount}
            min={1}
            max={3}
            onChange={setAiCount}
          />
          <DifficultyPills value={difficulty} onChange={setDifficulty} />
        </>
      }
      onStart={startGame}
      startLabel="Start Game"
    />
  );
}

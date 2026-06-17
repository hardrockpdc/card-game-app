import React, { useEffect, useState } from "react";
import { useHasSave } from "../game/useResumePrompt";
import { clearGame } from "../game/gameSaves";
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
  const saveKey = "@cardnight:save:gofish";
  const hasSavedGame = useHasSave(saveKey);

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

  const go = (resumeFromSave) =>
    navigation.navigate("GoFishGame", {
      role: "singleplayer",
      myName: playerName,
      players: buildPlayers(playerName, aiCount),
      difficulty,
      resumeFromSave,
    });
  const goFresh = () => go(false);
  const goResume = () => go(true);
  const startNew = async () => {
    await clearGame(saveKey);
    goFresh();
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
      onStart={goFresh}
      startLabel="Start Game"
      resume={
        hasSavedGame ? { onContinue: goResume, onStartNew: startNew } : null
      }
    />
  );
}

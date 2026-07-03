import React, { useState } from "react";

import GameSetupLayout from "../components/GameSetupLayout";
import VariantOptionGrid from "../components/VariantOptionGrid";
import { DIFFICULTIES, DIFFICULTY_ORDER } from "../game/memory";

// Difficulty options for the shared variant grid, built from the memory board
// shapes so the card/pair counts stay in sync with game/memory.js.
const OPTIONS = DIFFICULTY_ORDER.map((id) => {
  const d = DIFFICULTIES[id];
  return {
    id,
    label: d.label,
    description: `${d.pairs * 2} cards · ${d.pairs} pairs`,
  };
});

export default function MemoryDifficultyPickerScreen({ navigation, route }) {
  const [difficulty, setDifficulty] = useState(
    route?.params?.difficulty || "medium",
  );

  const start = () => navigation.navigate("MemoryGame", { difficulty });

  return (
    <GameSetupLayout
      title="Memory Match"
      subtitle="Choose a difficulty"
      variantSlot={
        <VariantOptionGrid
          value={difficulty}
          onChange={setDifficulty}
          options={OPTIONS}
          fill
        />
      }
      onStart={start}
      startLabel="Start Game"
    />
  );
}

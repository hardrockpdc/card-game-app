import React, { useState } from "react";

import GameSetupLayout from "../components/GameSetupLayout";
import VariantOptionGrid from "../components/VariantOptionGrid";
import { DIFFICULTIES, DIFFICULTY_ORDER } from "../game/memory";
import { getMemoryReward } from "../game/rewards";

// Difficulty options for the shared variant grid, built from the memory board
// shapes so the card/pair counts stay in sync with game/memory.js. The coin
// reward (bigger board = more coins) is shown so players see the payoff.
const OPTIONS = DIFFICULTY_ORDER.map((id) => {
  const d = DIFFICULTIES[id];
  return {
    id,
    label: d.label,
    description: `${d.pairs * 2} cards · ${d.pairs} pairs · ${getMemoryReward(id)} 🪙`,
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

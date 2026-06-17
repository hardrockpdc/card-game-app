import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { hasSave } from "./gameSaves";

// Reactively report whether a valid save exists for `saveKey`. Re-checks when
// the key changes (e.g. the user picks a different variant) and whenever the
// screen regains focus (e.g. they finished a game and came back). Lets a setup
// screen show "Continue Game" / "Start New Game" inline instead of a pop-up.
export function useHasSave(saveKey) {
  const [exists, setExists] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      hasSave(saveKey).then((v) => {
        if (active) setExists(v);
      });
      return () => {
        active = false;
      };
    }, [saveKey]),
  );
  return exists;
}

import { useCallback } from "react";
import { Alert } from "react-native";
import { hasSave, clearGame } from "./gameSaves";

export function useResumePrompt() {
  return useCallback(
    async ({ saveKey, gameName, onFresh, onResume, extraMessage }) => {
      const exists = await hasSave(saveKey);
      if (!exists) {
        onFresh();
        return;
      }
      const body = extraMessage
        ? `You have a saved ${gameName} game. Continue or start fresh?\n\n${extraMessage}`
        : `You have a saved ${gameName} game. Continue or start fresh?`;
      Alert.alert(
        "Game in Progress",
        body,
        [
          { text: "Continue Game", onPress: onResume },
          {
            text: "Start New Game",
            style: "destructive",
            onPress: async () => {
              await clearGame(saveKey);
              onFresh();
            },
          },
        ],
        // Tapping outside / back still dismisses with no action (an implicit
        // cancel), so no dedicated Cancel button is needed.
        { cancelable: true }
      );
    },
    [],
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResumePrompt } from "../game/useResumePrompt";

import VariantOptionGrid from "../components/VariantOptionGrid";
import { RUMMY_VARIANT_OPTIONS } from "../game/rummy";
import { scale, scaleFont } from "../game/responsive";

function getInitialVariant(currentVariant, options) {
  const found = options.find((option) => option.value === currentVariant);

  return found ? found.value : options[0].value;
}

function getModeCopy(mode) {
  if (mode === "lobby") {
    return {
      title: "Pick the Lobby Rummy Variant",
      subtitle: "Choose the rules you want to send back to the lobby.",
      buttonLabel: "Save Variant",
    };
  }

  return {
    title: "Rummy",
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

function RummyVariantPickerScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const { mode = "singleplayer", currentVariant, launchParams } = params;
  const pickerOptions = RUMMY_VARIANT_OPTIONS;

  const [selectedVariant, setSelectedVariant] = useState(() =>
    getInitialVariant(currentVariant, pickerOptions),
  );
  const [aiCount, setAiCount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const promptIfSaved = useResumePrompt();

  useEffect(() => {
    setSelectedVariant(getInitialVariant(currentVariant, pickerOptions));
  }, [currentVariant, pickerOptions]);

  const modeCopy = useMemo(() => getModeCopy(mode), [mode]);

  const handleContinue = async () => {
    if (mode === "lobby") {
      navigation.navigate({
        name: "Lobby",
        params: {
          selectedRummyVariant: selectedVariant,
        },
        merge: true,
      });
      return;
    }

    const launchPayload =
      launchParams && typeof launchParams === "object" ? launchParams : {};
    const playerName = launchPayload.myName ?? "Player";
    const players = buildPlayers(playerName, aiCount);

    const variantLabel =
      RUMMY_VARIANT_OPTIONS.find((o) => o.value === selectedVariant)?.label ??
      "Rummy";
    await promptIfSaved({
      saveKey: `@cardnight:save:rummy:${selectedVariant}`,
      gameName: variantLabel,
      onFresh: () =>
        navigation.navigate("RummyGame", {
          ...launchPayload,
          players,
          difficulty,
          variantId: selectedVariant,
          variant: selectedVariant,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("RummyGame", {
          ...launchPayload,
          players,
          difficulty,
          variantId: selectedVariant,
          variant: selectedVariant,
          resumeFromSave: true,
        }),
    });
  };

  const isSinglePlayer = mode !== "lobby";
  const { width: winW, height: winH } = useWindowDimensions();
  const isLandscape = winW > winH;

  const variantGrid = (
    <VariantOptionGrid
      value={selectedVariant}
      onChange={setSelectedVariant}
      options={pickerOptions}
      singleColumn={isLandscape}
    />
  );

  const controls = isSinglePlayer ? (
    <>
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>AI Opponents</Text>
        <View style={styles.pillRow}>
          {[1, 2, 3].map((count) => (
            <Pressable
              key={count}
              onPress={() => setAiCount(count)}
              style={({ pressed }) => [
                styles.pill,
                aiCount === count && styles.pillSelected,
                pressed && styles.pillPressed,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  aiCount === count && styles.pillTextSelected,
                ]}
              >
                {count}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Difficulty</Text>
        <View style={styles.pillRow}>
          {[
            { id: "easy", label: "Easy" },
            { id: "medium", label: "Medium" },
            { id: "hard", label: "Hard" },
          ].map((option) => {
            const selected = option.id === difficulty;

            return (
              <Pressable
                key={option.id}
                onPress={() => setDifficulty(option.id)}
                style={({ pressed }) => [
                  styles.pill,
                  selected && styles.pillSelected,
                  pressed && styles.pillPressed,
                ]}
              >
                <Text
                  style={[styles.pillText, selected && styles.pillTextSelected]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  ) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, isLandscape && styles.contentLandscape]}>
        <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
          {modeCopy.title}
        </Text>
        {modeCopy.subtitle && !isLandscape ? (
          <Text style={styles.subtitle}>{modeCopy.subtitle}</Text>
        ) : null}

        <View style={[styles.panel, isLandscape && styles.panelLandscape]}>
          {isLandscape && controls ? (
            <View style={styles.paneRow}>
              <View style={styles.pane}>{variantGrid}</View>
              <View style={styles.pane}>{controls}</View>
            </View>
          ) : (
            <View style={styles.paneStack}>
              {variantGrid}
              {controls}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={modeCopy.buttonLabel}
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
          >
            <Text style={styles.playButtonText}>{modeCopy.buttonLabel}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  content: {
    flex: 1,
    padding: scale(14),
    gap: scale(10),
  },
  contentLandscape: {
    padding: scale(10),
    gap: scale(6),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(34),
    fontWeight: "900",
    textAlign: "center",
  },
  titleLandscape: {
    fontSize: scaleFont(22),
  },
  subtitle: {
    color: "#a8b5c8",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
    textAlign: "center",
  },
  panel: {
    flex: 1,
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: scale(14),
    gap: scale(12),
  },
  panelLandscape: {
    padding: scale(10),
    gap: scale(8),
  },
  paneStack: {
    flex: 1,
    gap: scale(12),
    justifyContent: "center",
  },
  paneRow: {
    flex: 1,
    flexDirection: "row",
    gap: scale(12),
  },
  pane: {
    flex: 1,
    gap: scale(10),
    justifyContent: "center",
  },
  sectionBlock: {
    gap: scale(8),
  },
  sectionLabel: {
    color: "#a8b5c8",
    fontSize: scaleFont(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  pillRow: {
    flexDirection: "row",
    gap: scale(8),
  },
  pill: {
    flex: 1,
    minHeight: scale(48),
    borderRadius: scale(999),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillText: {
    color: "#d3dcec",
    fontSize: scaleFont(14),
    fontWeight: "800",
  },
  pillTextSelected: {
    color: "#eef4ff",
  },
  constraintNote: {
    color: "#6a7d96",
    fontSize: scaleFont(12),
    lineHeight: scale(17),
  },
  playButton: {
    borderRadius: scale(16),
    backgroundColor: "#77aef7",
    alignItems: "center",
    paddingVertical: scale(14),
    marginTop: scale(4),
  },
  playButtonPressed: {
    opacity: 0.92,
  },
  playButtonText: {
    color: "#08111f",
    fontSize: scaleFont(16),
    fontWeight: "900",
  },
});

export default RummyVariantPickerScreen;

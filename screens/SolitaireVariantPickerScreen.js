import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SolitaireVariantWheel from "../components/SolitaireVariantWheel";
import { SPIDER_MODE_OPTIONS, VARIANT_OPTIONS } from "../game/solitaire";
import { useResumePrompt } from "../game/useResumePrompt";
import { scale, scaleFont } from "../game/responsive";

export default function SolitaireVariantPickerScreen({ navigation, route }) {
  const initialVariantId = route?.params?.variantId || VARIANT_OPTIONS[0].id;
  const [variantId, setVariantId] = useState(initialVariantId);
  const [spiderMode, setSpiderMode] = useState(4);
  const promptIfSaved = useResumePrompt();

  const selectedVariant = useMemo(
    () =>
      VARIANT_OPTIONS.find((option) => option.id === variantId) ||
      VARIANT_OPTIONS[0],
    [variantId],
  );

  const startGame = async () => {
    const navParams = {
      variantId,
      spiderMode: variantId === "spider" ? spiderMode : undefined,
    };
    await promptIfSaved({
      saveKey: `@cardnight:save:solitaire:${variantId}`,
      gameName: selectedVariant.label,
      onFresh: () =>
        navigation.navigate("SolitaireGame", {
          ...navParams,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("SolitaireGame", {
          ...navParams,
          resumeFromSave: true,
        }),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Solitaire</Text>
        <Text style={styles.subtitle}>Pick a mode, then start a new game.</Text>

        <View style={styles.panel}>
          <SolitaireVariantWheel value={variantId} onChange={setVariantId} />

          {variantId === "spider" ? (
            <View style={styles.modeBlock}>
              <Text style={styles.modeLabel}>Spider suits</Text>
              <View style={styles.modeRow}>
                {SPIDER_MODE_OPTIONS.map((option) => {
                  const selected = option.id === spiderMode;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setSpiderMode(option.id)}
                      style={({ pressed }) => [
                        styles.modeChip,
                        selected && styles.modeChipSelected,
                        pressed && styles.modeChipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeChipText,
                          selected && styles.modeChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={startGame}
            style={({ pressed }) => [
              styles.playButton,
              pressed && styles.playButtonPressed,
            ]}
          >
            <Text style={styles.playButtonText}>Start Game</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f1115",
  },
  content: {
    padding: scale(18),
    gap: scale(14),
  },
  kicker: {
    color: "#7fb3ff",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontSize: scaleFont(12),
    fontWeight: "800",
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(34),
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#a8b5c8",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
  },
  panel: {
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: scale(16),
    gap: scale(16),
  },
  modeBlock: {
    gap: scale(8),
  },
  modeLabel: {
    color: "#dce5f2",
    fontSize: scaleFont(14),
    fontWeight: "800",
  },
  modeRow: {
    flexDirection: "row",
    gap: scale(8),
    flexWrap: "wrap",
  },
  modeChip: {
    borderRadius: scale(999),
    borderWidth: 1,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  modeChipSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  modeChipPressed: {
    opacity: 0.9,
  },
  modeChipText: {
    color: "#d3dcec",
    fontSize: scaleFont(12),
    fontWeight: "800",
  },
  modeChipTextSelected: {
    color: "#eef4ff",
  },
  playButton: {
    borderRadius: scale(16),
    backgroundColor: "#77aef7",
    alignItems: "center",
    paddingVertical: scale(14),
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

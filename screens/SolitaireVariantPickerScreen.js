import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SPIDER_MODE_OPTIONS, VARIANT_OPTIONS } from "../game/solitaire";
import { useResumePrompt } from "../game/useResumePrompt";
import { scale, scaleFont } from "../game/responsive";

const ACCENT = "#77AEF7";

export default function SolitaireVariantPickerScreen({ navigation, route }) {
  const initialVariantId = route?.params?.variantId || VARIANT_OPTIONS[0].id;
  const [variantId, setVariantId] = useState(initialVariantId);
  const [spiderMode, setSpiderMode] = useState(4);
  const promptIfSaved = useResumePrompt();

  // Responsive: fill the screen instead of scrolling. In landscape (short) the
  // options become a 2-column grid; on short screens the descriptions hide.
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const showDesc = !isLandscape && height >= 620;

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
      <View style={[styles.content, isLandscape && styles.contentLandscape]}>
        <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
          Solitaire
        </Text>
        {showDesc ? (
          <Text style={styles.subtitle}>
            Pick a mode, then start a new game.
          </Text>
        ) : null}

        <View style={[styles.panel, isLandscape && styles.panelLandscape]}>
          <View style={[styles.list, isLandscape && styles.listLandscape]}>
            {VARIANT_OPTIONS.map((option) => {
              const selected = option.id === variantId;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setVariantId(option.id)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  style={({ pressed }) => [
                    styles.option,
                    isLandscape && styles.optionLandscape,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      selected && styles.optionLabelSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                  {showDesc && option.description ? (
                    <Text
                      style={[
                        styles.optionDesc,
                        selected && styles.optionDescSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {option.description}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

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
    padding: scale(18),
    gap: scale(12),
  },
  contentLandscape: {
    padding: scale(10),
    gap: scale(8),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(34),
    fontWeight: "900",
    textAlign: "center",
  },
  titleLandscape: {
    fontSize: scaleFont(24),
  },
  subtitle: {
    color: "#a8b5c8",
    fontSize: scaleFont(15),
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
  // Portrait: single column, options share the height. Landscape: 2-col grid.
  list: {
    flex: 1,
    gap: scale(8),
    justifyContent: "center",
  },
  listLandscape: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
  },
  option: {
    flex: 1,
    minHeight: scale(48),
    maxHeight: scale(96),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: scale(16),
    justifyContent: "center",
  },
  optionLandscape: {
    flex: 0,
    width: "48%",
    minHeight: scale(50),
    maxHeight: scale(64),
  },
  optionSelected: {
    borderColor: ACCENT,
    backgroundColor: "rgba(119, 174, 247, 0.12)",
  },
  optionPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optionLabel: {
    color: "#A7B3C9",
    fontSize: scaleFont(17),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  optionLabelSelected: {
    color: "#F4F7FB",
  },
  optionDesc: {
    marginTop: scale(4),
    color: "#8FA0BA",
    fontSize: scaleFont(12),
  },
  optionDescSelected: {
    color: "#DCE5F2",
  },
  modeBlock: {
    gap: scale(6),
  },
  modeLabel: {
    color: "#dce5f2",
    fontSize: scaleFont(13),
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
    paddingVertical: scale(7),
  },
  modeChipSelected: {
    borderColor: ACCENT,
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
    backgroundColor: ACCENT,
    alignItems: "center",
    paddingVertical: scale(13),
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

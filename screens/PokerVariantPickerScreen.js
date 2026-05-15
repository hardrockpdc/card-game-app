import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useResumePrompt } from "../game/useResumePrompt";

import PokerVariantWheel, {
  POKER_VARIANT_OPTIONS,
} from "../components/PokerVariantWheel";
import {
  getCachedProfile,
  getDisplayName,
  subscribeProfile,
} from "../game/profile";
import { getCoins } from "../game/wallet";
import { scale, scaleFont } from "../game/responsive";

function getInitialVariant(currentVariant) {
  const found = POKER_VARIANT_OPTIONS.find(
    (option) => option.value === currentVariant,
  );

  return found ? found.value : POKER_VARIANT_OPTIONS[0].value;
}

function getModeCopy(mode) {
  if (mode === "lobby") {
    return {
      title: "Pick the Lobby Poker Variant",
      subtitle: "Choose the poker variant you want to send back to the lobby.",
      buttonLabel: "Save Variant",
    };
  }

  return {
    title: "Poker",
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

function PokerVariantPickerScreen({ navigation, route }) {
  const params = route?.params ?? {};
  const { mode = "singleplayer", currentVariant, launchParams } = params;

  const [playerName, setPlayerName] = useState("Player");
  const [selectedVariant, setSelectedVariant] = useState(() =>
    getInitialVariant(currentVariant),
  );
  const [aiCount, setAiCount] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const [coins, setCoins] = useState(null);
  const [buyIn, setBuyIn] = useState(100);
  const [freePlay, setFreePlay] = useState(false);
  const promptIfSaved = useResumePrompt();

  // Refresh wallet balance each time this screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      getCoins().then((c) => {
        setCoins(c);
        // If the previously selected buy-in is now unaffordable, reset to 100.
        setBuyIn((prev) => (c >= prev ? prev : 100));
      });
    }, []),
  );

  useEffect(() => {
    setSelectedVariant(getInitialVariant(currentVariant));
  }, [currentVariant]);

  useEffect(() => {
    let isMounted = true;

    function bootstrapProfile() {
      const profile = getCachedProfile();

      if (!isMounted) {
        return;
      }

      setPlayerName(getDisplayName(profile));
    }

    bootstrapProfile();

    const unsubscribe = subscribeProfile((profile) => {
      setPlayerName(getDisplayName(profile));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const modeCopy = useMemo(() => getModeCopy(mode), [mode]);
  const isLobby = mode === "lobby";
  const coinsLoaded = coins !== null;
  const canAffordMin = !coinsLoaded || coins >= 100;
  const canPlay = isLobby || freePlay || canAffordMin;

  const handleContinue = async () => {
    if (isLobby) {
      navigation.navigate({
        name: "Lobby",
        params: {
          selectedPokerVariant: selectedVariant,
        },
        merge: true,
      });
      return;
    }

    const launchPayload =
      launchParams && typeof launchParams === "object" ? launchParams : {};
    const players = buildPlayers(launchPayload.myName ?? playerName, aiCount);
    const saveKey = `@cardnight:save:poker:${selectedVariant}`;
    const variantLabel =
      POKER_VARIANT_OPTIONS.find((o) => o.value === selectedVariant)?.label ??
      "Poker";
    const navParams = {
      ...launchPayload,
      role: "singleplayer",
      myName: launchPayload.myName ?? playerName,
      players,
      difficulty,
      variant: selectedVariant,
      buyIn,
      freePlay,
    };
    await promptIfSaved({
      saveKey,
      gameName: variantLabel,
      onFresh: () =>
        navigation.navigate("PokerGame", {
          ...navParams,
          resumeFromSave: false,
        }),
      onResume: () =>
        navigation.navigate("PokerGame", {
          ...navParams,
          resumeFromSave: true,
        }),
      extraMessage: "Note: starting fresh will use a new buy-in.",
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{modeCopy.title}</Text>
        {modeCopy.subtitle ? (
          <Text style={styles.subtitle}>{modeCopy.subtitle}</Text>
        ) : null}

        <View style={styles.panel}>
          <PokerVariantWheel
            value={selectedVariant}
            onChange={setSelectedVariant}
          />

          {!isLobby ? (
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
                          style={[
                            styles.pillText,
                            selected && styles.pillTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Play Mode</Text>
                {[
                  {
                    id: "free",
                    label: "Free Play",
                    description: "Practice mode. No coins won or lost.",
                  },
                  {
                    id: "casino",
                    label: "Casino Play",
                    description: "Buy-in deducted. Winnings added to wallet.",
                  },
                ].map((m) => {
                  const selected = m.id === "free" ? freePlay : !freePlay;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setFreePlay(m.id === "free")}
                      style={({ pressed }) => [
                        styles.modeCard,
                        selected && styles.modeCardSelected,
                        pressed && styles.modeCardPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeLabel,
                          selected && styles.modeLabelSelected,
                        ]}
                      >
                        {m.label}
                      </Text>
                      <Text style={styles.modeDescription}>
                        {m.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={[
                  styles.sectionBlock,
                  freePlay && styles.sectionDisabled,
                ]}
                pointerEvents={freePlay ? "none" : "auto"}
              >
                <View style={styles.buyInHeader}>
                  <Text style={styles.sectionLabel}>Buy-In</Text>
                  {coinsLoaded ? (
                    <Text style={styles.walletBalance}>
                      🪙 {coins.toLocaleString()}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.pillRow}>
                  {[100, 250, 500, 1000].map((amount) => {
                    const isSelected = buyIn === amount;
                    const isAffordable = !coinsLoaded || coins >= amount;
                    return (
                      <Pressable
                        key={amount}
                        onPress={() => {
                          if (isAffordable) setBuyIn(amount);
                        }}
                        disabled={!isAffordable}
                        style={({ pressed }) => [
                          styles.pill,
                          isSelected && styles.buyInPillSelected,
                          !isAffordable && styles.pillDisabled,
                          pressed && isAffordable && styles.pillPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            styles.buyInChipText,
                            isSelected && styles.buyInPillTextSelected,
                            !isAffordable && styles.pillTextDisabled,
                          ]}
                        >
                          {amount}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {!freePlay && coinsLoaded && coins < 100 ? (
                  <Text style={styles.noCoinsWarning}>
                    You need at least 🪙 100 to play. Visit your Profile to
                    reset your coins.
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={modeCopy.buttonLabel}
            onPress={canPlay ? handleContinue : undefined}
            disabled={!canPlay}
            style={({ pressed }) => [
              styles.playButton,
              !canPlay && styles.playButtonDisabled,
              canPlay && pressed && styles.playButtonPressed,
            ]}
          >
            <Text style={styles.playButtonText}>{modeCopy.buttonLabel}</Text>
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
  container: {
    padding: scale(18),
    gap: scale(14),
  },
  title: {
    color: "#f5f7fb",
    fontSize: scaleFont(34),
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#95a2b6",
    fontSize: scaleFont(15),
    lineHeight: scale(21),
    textAlign: "center",
  },
  panel: {
    borderRadius: scale(22),
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: scale(16),
    gap: scale(16),
  },
  sectionBlock: {
    gap: scale(8),
  },
  sectionLabel: {
    color: "#95a2b6",
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
    paddingHorizontal: scale(4),
  },
  pillSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillDisabled: {
    opacity: 0.35,
  },
  pillText: {
    color: "#d3dcec",
    fontSize: scaleFont(13),
    fontWeight: "800",
  },
  pillTextSelected: {
    color: "#eef4ff",
  },
  pillTextDisabled: {
    color: "#555",
  },
  buyInHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletBalance: {
    color: "#ffd700",
    fontSize: scaleFont(14),
    fontWeight: "800",
  },
  buyInPillSelected: {
    borderColor: "#ffd700",
    backgroundColor: "#2a2a10",
  },
  buyInPillTextSelected: {
    color: "#ffd700",
  },
  noCoinsWarning: {
    color: "#e94560",
    fontSize: scaleFont(13),
    lineHeight: scale(18),
    textAlign: "center",
  },
  buyInChipText: {
    fontSize: scaleFont(11),
  },
  sectionDisabled: {
    opacity: 0.35,
  },
  modeCard: {
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    gap: scale(4),
  },
  modeCardSelected: {
    borderColor: "#77aef7",
    backgroundColor: "rgba(119, 174, 247, 0.12)",
  },
  modeCardPressed: {
    opacity: 0.85,
  },
  modeLabel: {
    color: "#a7b3c9",
    fontSize: scaleFont(17),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  modeLabelSelected: {
    color: "#f4f7fb",
  },
  modeDescription: {
    color: "#6a7d96",
    fontSize: scaleFont(13),
    lineHeight: scale(18),
  },
  playButton: {
    borderRadius: scale(16),
    backgroundColor: "#77aef7",
    alignItems: "center",
    paddingVertical: scale(14),
    marginTop: scale(4),
  },
  playButtonDisabled: {
    backgroundColor: "#444",
    opacity: 0.7,
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

export default PokerVariantPickerScreen;

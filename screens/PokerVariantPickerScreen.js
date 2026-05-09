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
    title: "Pick Your Poker Variant",
    subtitle: "Choose the rules for this poker game before you start.",
    buttonLabel: "Start Poker Game",
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
  const promptIfSaved = useResumePrompt();

  // Refresh wallet balance each time this screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      getCoins().then((c) => {
        setCoins(c);
        // If the previously selected buy-in is now unaffordable, reset to 100.
        setBuyIn((prev) => (c >= prev ? prev : 100));
      });
    }, [])
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
  const selectedLabel =
    POKER_VARIANT_OPTIONS.find((option) => option.value === selectedVariant)
      ?.label ?? "";
  const isLobby = mode === "lobby";
  // Coins loaded and player can afford the minimum buy-in.
  const coinsLoaded = coins !== null;
  const canAffordMin = !coinsLoaded || coins >= 100;
  const canPlay = isLobby || canAffordMin;

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
      POKER_VARIANT_OPTIONS.find((o) => o.value === selectedVariant)?.label ?? "Poker";
    const navParams = {
      ...launchPayload,
      role: "singleplayer",
      myName: launchPayload.myName ?? playerName,
      players,
      difficulty,
      variant: selectedVariant,
      buyIn,
    };
    await promptIfSaved({
      saveKey,
      gameName: variantLabel,
      onFresh: () => navigation.navigate("PokerGame", { ...navParams, resumeFromSave: false }),
      onResume: () => navigation.navigate("PokerGame", { ...navParams, resumeFromSave: true }),
      extraMessage: "Note: starting fresh will use a new buy-in.",
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.playerPill}>
          <Text style={styles.playerPillText}>Playing as {playerName}</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{modeCopy.title}</Text>
          <Text style={styles.subtitle}>{modeCopy.subtitle}</Text>
        </View>

        <View style={styles.wheelCard}>
          <PokerVariantWheel
            value={selectedVariant}
            onChange={setSelectedVariant}
          />
        </View>

        {!isLobby ? (
          <View style={styles.settingsCard}>
            {coinsLoaded && (
              <View style={styles.walletRow}>
                <Text style={styles.settingsLabel}>Your Balance</Text>
                <Text style={styles.walletBalance}>🪙 {coins.toLocaleString()}</Text>
              </View>
            )}

            <Text style={styles.settingsLabel}>Buy-In</Text>
            <View style={styles.buyInRow}>
              {[100, 250, 500, 1000].map((amount) => {
                const isSelected = buyIn === amount;
                const isAffordable = !coinsLoaded || coins >= amount;
                return (
                  <Pressable
                    key={amount}
                    onPress={() => { if (isAffordable) setBuyIn(amount); }}
                    disabled={!isAffordable}
                    style={({ pressed }) => [
                      styles.buyInButton,
                      isSelected && styles.buyInButtonSelected,
                      !isAffordable && styles.buyInButtonDisabled,
                      pressed && isAffordable && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buyInButtonText,
                        isSelected && styles.buyInButtonTextSelected,
                        !isAffordable && styles.buyInButtonTextDisabled,
                      ]}
                    >
                      🪙 {amount}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {coinsLoaded && coins < 100 && (
              <Text style={styles.noCoinsWarning}>
                You need at least 🪙 100 to play. Visit your Profile to reset your coins.
              </Text>
            )}

            <Text style={styles.settingsLabel}>Computer Opponents</Text>
            <View style={styles.countRow}>
              {[1, 2, 3].map((count) => (
                <Pressable
                  key={count}
                  onPress={() => setAiCount(count)}
                  style={({ pressed }) => [
                    styles.countButton,
                    aiCount === count && styles.countButtonSelected,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.countButtonText,
                      aiCount === count && styles.countButtonTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.settingsLabel}>Difficulty</Text>
            <View style={styles.difficultyRow}>
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
                      styles.difficultyButton,
                      selected && styles.difficultyButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyButtonText,
                        selected && styles.difficultyButtonTextSelected,
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

        <View style={styles.selectionSummary}>
          <Text style={styles.selectionLabel}>Current selection</Text>
          <Text style={styles.selectionValue}>{selectedLabel}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={modeCopy.buttonLabel}
          onPress={canPlay ? handleContinue : undefined}
          disabled={!canPlay}
          style={({ pressed }) => [
            styles.button,
            !canPlay && styles.buttonDisabled,
            canPlay && pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>{modeCopy.buttonLabel}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#07111F",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#07111F",
  },
  playerPill: {
    backgroundColor: "#16213e",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#334",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 18,
  },
  playerPillText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: "#F4F7FB",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 8,
    color: "#A7B3C9",
    fontSize: 15,
    lineHeight: 21,
  },
  wheelCard: {
    marginBottom: 18,
  },
  settingsCard: {
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
    gap: 12,
  },
  settingsLabel: {
    color: "#A7B3C9",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  countRow: {
    flexDirection: "row",
    gap: 10,
  },
  countButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  countButtonSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  countButtonText: {
    color: "#d3dcec",
    fontSize: 16,
    fontWeight: "800",
  },
  countButtonTextSelected: {
    color: "#eef4ff",
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
  },
  difficultyButtonSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  difficultyButtonText: {
    color: "#d3dcec",
    fontSize: 12,
    fontWeight: "800",
  },
  difficultyButtonTextSelected: {
    color: "#eef4ff",
  },
  selectionSummary: {
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#24344D",
    backgroundColor: "#0B1320",
  },
  selectionLabel: {
    color: "#A7B3C9",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  selectionValue: {
    marginTop: 8,
    color: "#F4F7FB",
    fontSize: 18,
    fontWeight: "700",
  },
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletBalance: {
    color: "#ffd700",
    fontSize: 16,
    fontWeight: "800",
  },
  buyInRow: {
    flexDirection: "row",
    gap: 8,
  },
  buyInButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  buyInButtonSelected: {
    borderColor: "#ffd700",
    backgroundColor: "#2a2a10",
  },
  buyInButtonDisabled: {
    opacity: 0.35,
  },
  buyInButtonText: {
    color: "#d3dcec",
    fontSize: 12,
    fontWeight: "800",
  },
  buyInButtonTextSelected: {
    color: "#ffd700",
  },
  buyInButtonTextDisabled: {
    color: "#555",
  },
  noCoinsWarning: {
    color: "#e94560",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  button: {
    marginTop: "auto",
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C1121F",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#444",
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
});

export default PokerVariantPickerScreen;

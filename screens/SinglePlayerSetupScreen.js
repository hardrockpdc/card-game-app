import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

const GAMES = [
  {
    id: "blackjack",
    label: "Blackjack",
    screen: "Game",
    aiRange: [0, 0],
    hasDifficulty: false,
    hasTone: false,
  },
  {
    id: "goFish",
    label: "Go Fish",
    screen: "GoFishGame",
    aiRange: [1, 3],
    hasDifficulty: true,
    hasTone: false,
  },
  {
    id: "conquian",
    label: "Conquián",
    screen: "ConquianGame",
    aiRange: [1, 3],
    hasDifficulty: true,
    hasTone: false,
  },
  {
    id: "poker",
    label: "Poker",
    screen: "PokerGame",
    aiRange: [1, 3],
    hasDifficulty: true,
    hasTone: false,
  },
  {
    id: "wildRound",
    label: "Wild Round",
    screen: "WildRoundGame",
    aiRange: [2, 7],
    hasDifficulty: false,
    hasTone: true,
  },
];

const DIFFICULTIES = [
  { id: "easy", label: "Easy", hint: "Random play, makes mistakes" },
  { id: "medium", label: "Medium", hint: "Solid play, decent strategy" },
  { id: "hard", label: "Hard", hint: "Strong play, hard to beat" },
];

export default function SinglePlayerSetupScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;

  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("goFish");
  const [numAI, setNumAI] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const [tone, setTone] = useState("family");

  const game = GAMES.find((g) => g.id === gameId);
  const [minAI, maxAI] = game.aiRange;
  const clampedAI = Math.min(Math.max(numAI, minAI), maxAI);

  const containerPadding = isSmallScreen ? 16 : 24;
  const contentMaxWidth = isTablet ? 560 : 460;
  const titleSize = isSmallScreen ? 24 : isTablet ? 34 : 28;
  const labelSize = isSmallScreen ? 12 : 13;
  const inputSize = isSmallScreen ? 16 : 18;
  const chipPaddingX = isSmallScreen ? 14 : 18;
  const chipPaddingY = isSmallScreen ? 9 : 10;
  const chipTextSize = isSmallScreen ? 14 : 15;
  const countButtonSize = isSmallScreen ? 56 : 64;
  const stepperButtonSize = isSmallScreen ? 48 : 52;
  const playButtonVertical = isSmallScreen ? 16 : 18;
  const playButtonTextSize = isSmallScreen ? 20 : 22;

  function handlePlay() {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (game.id === "blackjack") {
      navigation.navigate("Game");
      return;
    }

    const players = [
      { id: "host", name: trimmed },
      ...Array.from({ length: clampedAI }, (_, i) => ({
        id: `ai_${i + 1}`,
        name: clampedAI > 1 ? `Computer ${i + 1}` : "Computer",
        isAI: true,
      })),
    ];

    const params = { role: "singleplayer", myName: trimmed, players };

    if (game.hasDifficulty) params.difficulty = difficulty;
    if (game.hasTone) params.tone = tone;

    navigation.navigate(game.screen, params);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { padding: containerPadding },
        ]}
      >
        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            Single Player
          </Text>

          <Text style={[styles.label, { fontSize: labelSize }]}>Your Name</Text>
          <TextInput
            style={[styles.input, { fontSize: inputSize }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#555"
            maxLength={20}
            returnKeyType="done"
          />

          <Text style={[styles.label, { fontSize: labelSize }]}>
            Pick a Game
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
          >
            <View style={styles.chipRow}>
              {GAMES.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.chip,
                    {
                      paddingHorizontal: chipPaddingX,
                      paddingVertical: chipPaddingY,
                    },
                    gameId === g.id && styles.chipSelected,
                  ]}
                  onPress={() => {
                    setGameId(g.id);
                    setNumAI(
                      Math.min(Math.max(numAI, g.aiRange[0]), g.aiRange[1]),
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { fontSize: chipTextSize },
                      gameId === g.id && styles.chipTextSelected,
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {game.id === "blackjack" ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                You vs the Dealer — no opponents to pick
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { fontSize: labelSize }]}>
                {maxAI === 1 ? "Opponent" : "Computer Opponents"}
              </Text>

              {maxAI > 3 ? (
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      {
                        width: stepperButtonSize,
                        height: stepperButtonSize,
                        borderRadius: stepperButtonSize / 2,
                      },
                    ]}
                    onPress={() => setNumAI((n) => Math.max(n - 1, minAI))}
                    disabled={clampedAI <= minAI}
                  >
                    <Text
                      style={[
                        styles.stepperBtnText,
                        { fontSize: isSmallScreen ? 26 : 28 },
                        clampedAI <= minAI && styles.stepperBtnDimmed,
                      ]}
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.stepperValue}>{clampedAI}</Text>

                  <TouchableOpacity
                    style={[
                      styles.stepperBtn,
                      {
                        width: stepperButtonSize,
                        height: stepperButtonSize,
                        borderRadius: stepperButtonSize / 2,
                      },
                    ]}
                    onPress={() => setNumAI((n) => Math.min(n + 1, maxAI))}
                    disabled={clampedAI >= maxAI}
                  >
                    <Text
                      style={[
                        styles.stepperBtnText,
                        { fontSize: isSmallScreen ? 26 : 28 },
                        clampedAI >= maxAI && styles.stepperBtnDimmed,
                      ]}
                    >
                      +
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : maxAI > 1 ? (
                <View style={styles.countRow}>
                  {[1, 2, 3]
                    .filter((n) => n >= minAI && n <= maxAI)
                    .map((n) => (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.countBtn,
                          {
                            width: countButtonSize,
                            height: countButtonSize,
                            borderRadius: countButtonSize / 2,
                          },
                          clampedAI === n && styles.countBtnSelected,
                        ]}
                        onPress={() => setNumAI(n)}
                      >
                        <Text
                          style={[
                            styles.countBtnText,
                            { fontSize: isSmallScreen ? 24 : 26 },
                            clampedAI === n && styles.countBtnTextSelected,
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              ) : (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>1 Computer opponent</Text>
                </View>
              )}
            </>
          )}

          {game.hasTone && (
            <>
              <Text style={[styles.label, { fontSize: labelSize }]}>
                Card Tone
              </Text>
              <View style={styles.chipRow}>
                {[
                  { id: "family", label: "Family 🧒" },
                  { id: "mature", label: "Mature 🔞" },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.chip,
                      {
                        paddingHorizontal: chipPaddingX,
                        paddingVertical: chipPaddingY,
                      },
                      tone === t.id && styles.chipSelected,
                    ]}
                    onPress={() => setTone(t.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { fontSize: chipTextSize },
                        tone === t.id && styles.chipTextSelected,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {game.hasDifficulty && (
            <>
              <Text style={[styles.label, { fontSize: labelSize }]}>
                AI Difficulty
              </Text>
              <View style={styles.diffRow}>
                {DIFFICULTIES.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.diffBtn,
                      difficulty === d.id && styles.diffBtnSelected,
                    ]}
                    onPress={() => setDifficulty(d.id)}
                  >
                    <Text
                      style={[
                        styles.diffBtnText,
                        difficulty === d.id && styles.diffBtnTextSelected,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.diffHint}>
                {DIFFICULTIES.find((d) => d.id === difficulty)?.hint}
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.playBtn,
              { paddingVertical: playButtonVertical },
              !name.trim() && styles.playBtnDimmed,
            ]}
            onPress={handlePlay}
            disabled={!name.trim()}
          >
            <Text
              style={[styles.playBtnText, { fontSize: playButtonTextSize }]}
            >
              Play!
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
  },
  content: {
    width: "100%",
  },
  title: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 28,
    textAlign: "center",
  },
  label: {
    color: "#b0b0c0",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 24,
  },
  input: {
    backgroundColor: "#16213e",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    borderWidth: 1.5,
    borderColor: "#334",
  },
  chipScroll: {
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 20,
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
  },
  chipSelected: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
  },
  chipText: {
    color: "#b0b0c0",
    fontWeight: "bold",
  },
  chipTextSelected: {
    color: "#fff",
  },
  countRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  countBtn: {
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
  },
  countBtnSelected: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
  },
  countBtnText: {
    color: "#b0b0c0",
    fontWeight: "bold",
  },
  countBtnTextSelected: {
    color: "#fff",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  stepperBtn: {
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  stepperBtnDimmed: {
    color: "#444",
  },
  stepperValue: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "bold",
    minWidth: 40,
    textAlign: "center",
  },
  diffRow: {
    flexDirection: "row",
    gap: 10,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
    alignItems: "center",
  },
  diffBtnSelected: {
    backgroundColor: "#1565c0",
    borderColor: "#1565c0",
  },
  diffBtnText: {
    color: "#b0b0c0",
    fontSize: 15,
    fontWeight: "bold",
  },
  diffBtnTextSelected: {
    color: "#fff",
  },
  diffHint: {
    color: "#666",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  infoBox: {
    backgroundColor: "#16213e",
    borderRadius: 10,
    padding: 14,
  },
  infoText: {
    color: "#b0b0c0",
    fontSize: 15,
    textAlign: "center",
  },
  playBtn: {
    backgroundColor: "#4caf50",
    borderRadius: 12,
    alignItems: "center",
    marginTop: 36,
  },
  playBtnDimmed: {
    backgroundColor: "#2d5c35",
  },
  playBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

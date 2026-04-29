import React, { useState, useRef, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";

// ─── Display data for the carousel (order + visuals) ─────────────────────────

const CAROUSEL_GAMES = [
  {
    id: "blackjack",
    label: "Blackjack",
    players: "1 player",
    tag: "Classic",
    color: "#081a0f",
    accent: "#2e7d32",
  },
  {
    id: "goFish",
    label: "Go Fish",
    players: "1–4 players",
    tag: "vs AI",
    color: "#080d1f",
    accent: "#1565c0",
  },
  {
    id: "poker",
    label: "Poker",
    players: "1–5 players",
    tag: "Texas Hold'em",
    color: "#120822",
    accent: "#6a1b9a",
  },
  {
    id: "conquian",
    label: "Conquián",
    players: "1–4 players",
    tag: "Mexican Rummy",
    color: "#1a0d04",
    accent: "#bf360c",
  },
  {
    id: "wildRound",
    label: "Wild Round",
    players: "3–8 players",
    tag: "Party game",
    color: "#060620",
    accent: "#283593",
  },
];

// ─── Logic data (unchanged from original) ────────────────────────────────────

const GAMES = [
  { id: "blackjack", screen: "Game",          aiRange: [0, 0], hasDifficulty: false, hasTone: false },
  { id: "goFish",    screen: "GoFishGame",     aiRange: [1, 3], hasDifficulty: true,  hasTone: false },
  { id: "poker",     screen: "PokerGame",      aiRange: [1, 3], hasDifficulty: true,  hasTone: false },
  { id: "conquian",  screen: "ConquianGame",   aiRange: [1, 3], hasDifficulty: true,  hasTone: false },
  { id: "wildRound", screen: "WildRoundGame",  aiRange: [2, 7], hasDifficulty: false, hasTone: true  },
];

const DIFFICULTIES = [
  { id: "easy",   label: "Easy",   hint: "Random play, makes mistakes" },
  { id: "medium", label: "Medium", hint: "Solid play, decent strategy" },
  { id: "hard",   label: "Hard",   hint: "Strong play, hard to beat"   },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SinglePlayerSetupScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;

  const profileName = route.params?.profileName || "";
  const playerName = profileName.trim() || "Player";

  // Start on Go Fish (index 1) — matches original default gameId
  const [currentIndex, setCurrentIndex] = useState(1);
  const [numAI, setNumAI] = useState(1);
  const [difficulty, setDifficulty] = useState("medium");
  const [tone, setTone] = useState("family");

  const flatListRef = useRef(null);

  // ─── Carousel geometry ──────────────────────────────────────────────────────
  const CARD_WIDTH = width * 0.78;
  const CARD_HEIGHT = 246;
  const GAP = 12;
  const SIDE_OFFSET = (width - CARD_WIDTH) / 2;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;

  // ─── Derived game state ─────────────────────────────────────────────────────
  const carouselGame = CAROUSEL_GAMES[currentIndex];
  const game = GAMES.find((g) => g.id === carouselGame.id);
  const [minAI, maxAI] = game.aiRange;
  const clampedAI = Math.min(Math.max(numAI, minAI), maxAI);

  // ─── Carousel callbacks ─────────────────────────────────────────────────────
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const idx = viewableItems[0].index;
      setCurrentIndex(idx);
      const g = GAMES.find((g) => g.id === CAROUSEL_GAMES[idx].id);
      if (g) setNumAI((n) => Math.min(Math.max(n, g.aiRange[0]), g.aiRange[1]));
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // ─── Play handler ───────────────────────────────────────────────────────────
  function handlePlay() {
    if (game.id === "blackjack") {
      navigation.navigate("Game");
      return;
    }

    const players = [
      { id: "host", name: playerName },
      ...Array.from({ length: clampedAI }, (_, i) => ({
        id: `ai_${i + 1}`,
        name: clampedAI > 1 ? `Computer ${i + 1}` : "Computer",
        isAI: true,
      })),
    ];

    const params = { role: "singleplayer", myName: playerName, players };
    if (game.hasDifficulty) params.difficulty = difficulty;
    if (game.hasTone) params.tone = tone;

    navigation.navigate(game.screen, params);
  }

  // ─── Size vars ──────────────────────────────────────────────────────────────
  const labelSize = isSmallScreen ? 12 : 13;
  const titleSize = isSmallScreen ? 24 : isTablet ? 34 : 28;
  const countButtonSize = isSmallScreen ? 56 : 64;
  const stepperButtonSize = isSmallScreen ? 48 : 52;
  const playButtonTextSize = isSmallScreen ? 20 : 22;
  const padH = isSmallScreen ? 16 : 24;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Carousel label ── */}
        <Text style={[styles.label, { fontSize: labelSize, paddingHorizontal: padH, marginTop: 24 }]}>
          Pick a Game
        </Text>

        {/* ── Game carousel ── */}
        <FlatList
          ref={flatListRef}
          data={CAROUSEL_GAMES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SIDE_OFFSET }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={currentIndex}
          getItemLayout={(_, index) => ({
            length: SNAP_INTERVAL,
            offset: SNAP_INTERVAL * index,
            index,
          })}
          renderItem={({ item, index }) => {
            const isActive = index === currentIndex;
            return (
              <View style={{ width: CARD_WIDTH, marginRight: GAP }}>
                <View
                  style={[
                    styles.gameCard,
                    {
                      backgroundColor: item.color,
                      borderColor: item.accent,
                      height: CARD_HEIGHT,
                      transform: [{ scale: isActive ? 1.03 : 0.88 }],
                      opacity: isActive ? 1 : 0.5,
                    },
                  ]}
                >
                  {/* Game name */}
                  <Text style={styles.cardName}>{item.label}</Text>

                  {/* Placeholder visual */}
                  <View style={[styles.cardVisual, { borderColor: item.accent + "55" }]}>
                    <Text style={styles.cardVisualText}>visual coming soon</Text>
                  </View>

                  {/* Footer: player count + tag */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPlayers}>{item.players}</Text>
                    <View style={[styles.cardTag, { borderColor: item.accent }]}>
                      <Text style={[styles.cardTagText, { color: item.accent }]}>
                        {item.tag}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* ── Dot indicators ── */}
        <View style={styles.dotsRow}>
          {CAROUSEL_GAMES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>

        {/* ── Settings + Play — back inside padded container ── */}
        <View style={{ paddingHorizontal: padH }}>

          {/* AI opponent count */}
          {game.id === "blackjack" ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>You vs the Dealer — no opponents to pick</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { fontSize: labelSize }]}>
                {maxAI === 1 ? "Opponent" : "Computer Opponents"}
              </Text>

              {maxAI > 3 ? (
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { width: stepperButtonSize, height: stepperButtonSize, borderRadius: stepperButtonSize / 2 }]}
                    onPress={() => setNumAI((n) => Math.max(n - 1, minAI))}
                    disabled={clampedAI <= minAI}
                  >
                    <Text style={[styles.stepperBtnText, { fontSize: isSmallScreen ? 26 : 28 }, clampedAI <= minAI && styles.stepperBtnDimmed]}>
                      −
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{clampedAI}</Text>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { width: stepperButtonSize, height: stepperButtonSize, borderRadius: stepperButtonSize / 2 }]}
                    onPress={() => setNumAI((n) => Math.min(n + 1, maxAI))}
                    disabled={clampedAI >= maxAI}
                  >
                    <Text style={[styles.stepperBtnText, { fontSize: isSmallScreen ? 26 : 28 }, clampedAI >= maxAI && styles.stepperBtnDimmed]}>
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
                          { width: countButtonSize, height: countButtonSize, borderRadius: countButtonSize / 2 },
                          clampedAI === n && styles.countBtnSelected,
                        ]}
                        onPress={() => setNumAI(n)}
                      >
                        <Text style={[
                          styles.countBtnText,
                          { fontSize: isSmallScreen ? 24 : 26 },
                          clampedAI === n && styles.countBtnTextSelected,
                        ]}>
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

          {/* Tone picker */}
          {game.hasTone && (
            <>
              <Text style={[styles.label, { fontSize: labelSize }]}>Card Tone</Text>
              <View style={styles.chipRow}>
                {[
                  { id: "family", label: "Family 🧒" },
                  { id: "mature", label: "Mature 🔞" },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, tone === t.id && styles.chipSelected]}
                    onPress={() => setTone(t.id)}
                  >
                    <Text style={[styles.chipText, tone === t.id && styles.chipTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Difficulty picker */}
          {game.hasDifficulty && (
            <>
              <Text style={[styles.label, { fontSize: labelSize }]}>AI Difficulty</Text>
              <View style={styles.diffRow}>
                {DIFFICULTIES.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.diffBtn, difficulty === d.id && styles.diffBtnSelected]}
                    onPress={() => setDifficulty(d.id)}
                  >
                    <Text style={[styles.diffBtnText, difficulty === d.id && styles.diffBtnTextSelected]}>
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

          {/* Play button */}
          <TouchableOpacity
            style={[styles.playBtn, { paddingVertical: isSmallScreen ? 16 : 18 }]}
            onPress={handlePlay}
          >
            <Text style={[styles.playBtnText, { fontSize: playButtonTextSize }]}>
              Play {carouselGame.label}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#1a1a2e",
    paddingBottom: 40,
  },

  // Header
  title: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 24,
    marginTop: 8,
    textAlign: "center",
  },

  // Labels
  label: {
    color: "#b0b0c0",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },

  // ── Game card ──────────────────────────────────────────────────────────────
  gameCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    justifyContent: "space-between",
  },
  cardName: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardVisual: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardVisualText: {
    color: "#555",
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPlayers: {
    color: "#b0b0c0",
    fontSize: 13,
  },
  cardTag: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: "bold",
  },

  // ── Dot indicators ─────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#334",
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
    backgroundColor: "#e94560",
  },

  // ── AI count picker ────────────────────────────────────────────────────────
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

  // ── Tone / chip pickers ────────────────────────────────────────────────────
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
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: "#4caf50",
    borderColor: "#4caf50",
  },
  chipText: {
    color: "#b0b0c0",
    fontWeight: "bold",
    fontSize: 15,
  },
  chipTextSelected: {
    color: "#fff",
  },

  // ── Difficulty picker ──────────────────────────────────────────────────────
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

  // ── Info box ───────────────────────────────────────────────────────────────
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

  // ── Play button ────────────────────────────────────────────────────────────
  playBtn: {
    backgroundColor: "#e94560",
    borderRadius: 12,
    alignItems: "center",
    marginTop: 36,
  },
  playBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

import React, { useState, useRef, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import {
  getCachedProfile,
  getDisplayName,
  hasProfileName,
  subscribeProfile,
} from "../game/profile";
import { hasSave, clearGame } from "../game/gameSaves";

// ─── Display data for the carousel (order + visuals) ─────────────────────────

const CAROUSEL_GAMES = [
  {
    id: "blackjack",
    label: "Blackjack",
    players: "1 player",
    tag: "Classic",
    color: "#081a0f",
    accent: "#2e7d32",
    image: require("../assets/images/thumb_blackjack.png"),
  },
  {
    id: "solitaire",
    label: "Solitaire",
    players: "1 player",
    tag: "5 classic modes",
    color: "#101826",
    accent: "#7fb3ff",
    image: require("../assets/images/thumb_solitaire.png"),
  },
  {
    id: "rummy",
    label: "Rummy",
    players: "2–4 players",
    tag: "5 classic modes",
    color: "#14131f",
    accent: "#e94560",
    image: require("../assets/images/thumb_rummy.png"),
  },
  {
    id: "goFish",
    label: "Go Fish",
    players: "1–4 players",
    tag: "Go Fish!",
    color: "#080d1f",
    accent: "#1565c0",
    image: require("../assets/images/thumb_gofish.png"),
  },
  {
    id: "poker",
    label: "Poker",
    players: "1–5 players",
    tag: "Texas Hold'em",
    color: "#120822",
    accent: "#6a1b9a",
    image: require("../assets/images/thumb_poker.png"),
  },
  {
    id: "lastCard",
    label: "Last Card",
    players: "2–8 players",
    tag: "UNO-style",
    color: "#111827",
    accent: "#e94560",
    image: require("../assets/images/thumb_lastcard.png"),
  },
];

// ─── Logic data (unchanged from original) ────────────────────────────────────

const GAMES = [
  {
    id: "blackjack",
    screen: "Game",
    aiRange: [0, 0],
    hasDifficulty: false,
  },
  {
    id: "solitaire",
    screen: "SolitaireGame",
    aiRange: [0, 0],
    hasDifficulty: false,
  },
  {
    id: "rummy",
    screen: "RummyGame",
    aiRange: [1, 3],
    hasDifficulty: true,
  },
  {
    id: "goFish",
    screen: "GoFishGame",
    aiRange: [1, 3],
    hasDifficulty: true,
  },
  {
    id: "poker",
    screen: "PokerGame",
    aiRange: [1, 3],
    hasDifficulty: true,
  },
  {
    id: "lastCard",
    screen: "LastCardGame",
    aiRange: [1, 7],
    hasDifficulty: true,
  },
];

const DIFFICULTIES = [
  { id: "easy", label: "Easy", hint: "" },
  { id: "medium", label: "Medium", hint: "" },
  { id: "hard", label: "Hard", hint: "" },
];

const DEFAULT_POKER_VARIANT = "texasHoldem";
const DEFAULT_RUMMY_VARIANT = "ginRummy";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SinglePlayerSetupScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;

  const [playerName, setPlayerName] = useState("Player");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Start on Blackjack (index 0) — matches original default gameId
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    function bootstrapProfile() {
      const profile = getCachedProfile();

      if (!isMounted) {
        return;
      }

      setPlayerName(getDisplayName(profile));
      setIsLoadingProfile(false);
    }

    bootstrapProfile();

    const unsubscribeProfile = subscribeProfile((profile) => {
      setPlayerName(getDisplayName(profile));
    });

    return () => {
      isMounted = false;
      unsubscribeProfile();
    };
  }, []);

  // ─── Carousel geometry ──────────────────────────────────────────────────────
  const CARD_WIDTH = width * 0.78;
  const GAP = 12;
  const SIDE_OFFSET = (width - CARD_WIDTH) / 2;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;
  const cardTopSpace = isSmallScreen ? 104 : isTablet ? 128 : 116;
  const cardBottomSpace = isSmallScreen ? 148 : isTablet ? 160 : 154;
  const availableCardHeight = height - cardTopSpace - cardBottomSpace;
  const ACTIVE_SCALE = 1.03;
  const CARD_HEIGHT = Math.max(
    isSmallScreen ? 280 : 340,
    Math.round((availableCardHeight * 0.8) / ACTIVE_SCALE),
  );
  const CAROUSEL_VERTICAL_PADDING = Math.round(
    (CARD_HEIGHT * ACTIVE_SCALE - CARD_HEIGHT) / 2,
  );

  // ─── Derived game state ─────────────────────────────────────────────────────
  const carouselGame = CAROUSEL_GAMES[currentIndex];
  const game = GAMES.find((g) => g.id === carouselGame.id);
  const playButtonLabel = `Play ${carouselGame.label}`;

  function openPokerVariantPicker() {
    navigation.navigate("PokerVariantPicker", {
      mode: "singleplayer",
      currentVariant: DEFAULT_POKER_VARIANT,
    });
  }

  function openSolitaireVariantPicker() {
    navigation.navigate("SolitaireVariantPicker");
  }

  function openRummyVariantPicker() {
    navigation.navigate("RummyVariantPicker", {
      mode: "singleplayer",
      currentVariant: DEFAULT_RUMMY_VARIANT,
    });
  }

  function openGameSetup() {
    navigation.navigate("GameSetup", {
      mode: "singleplayer",
      gameId: game.id,
      gameName: carouselGame.label,
      screenName: game.screen,
      aiRange: game.aiRange,
      hasDifficulty: game.hasDifficulty,
    });
  }

  // ─── Carousel callbacks ─────────────────────────────────────────────────────
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // ─── Play handler ───────────────────────────────────────────────────────────
  async function handlePlay() {
    if (game.id === "blackjack") {
      const exists = await hasSave("@cardnight:save:blackjack");
      if (exists) {
        Alert.alert(
          "Game in Progress",
          "You have a saved Blackjack game. Continue or start fresh?",
          [
            {
              text: "Start New",
              style: "destructive",
              onPress: async () => {
                await clearGame("@cardnight:save:blackjack");
                navigation.navigate("Game");
              },
            },
            {
              text: "Continue",
              onPress: () => navigation.navigate("Game", { resumeFromSave: true }),
            },
          ],
        );
      } else {
        navigation.navigate("Game");
      }
      return;
    }

    if (game.id === "poker") {
      openPokerVariantPicker();
      return;
    }

    if (game.id === "solitaire") {
      openSolitaireVariantPicker();
      return;
    }

    if (game.id === "rummy") {
      openRummyVariantPicker();
      return;
    }

    if (game.id === "goFish" || game.id === "lastCard") {
      openGameSetup();
      return;
    }

    navigation.navigate(game.screen);
  }

  // ─── Size vars ──────────────────────────────────────────────────────────────
  const labelSize = isSmallScreen ? 12 : 13;
  const titleSize = isSmallScreen ? 24 : isTablet ? 34 : 28;
  const countButtonSize = isSmallScreen ? 56 : 64;
  const stepperButtonSize = isSmallScreen ? 48 : 52;
  const playButtonTextSize = isSmallScreen ? 20 : 22;
  const padH = isSmallScreen ? 16 : 24;

  if (isLoadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#e94560" size="large" />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Game carousel ── */}
        <FlatList
          style={{
            marginTop: isSmallScreen ? 26 : isTablet ? 32 : 28,
          }}
          ref={flatListRef}
          data={CAROUSEL_GAMES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: SIDE_OFFSET,
            paddingTop: CAROUSEL_VERTICAL_PADDING,
            paddingBottom: CAROUSEL_VERTICAL_PADDING,
          }}
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
            const isPoker = item.id === "poker";
            const isSolitaire = item.id === "solitaire";
            const isRummy = item.id === "rummy";

            return (
              <TouchableOpacity
                style={{ width: CARD_WIDTH, marginRight: GAP }}
                activeOpacity={0.92}
                onPress={
                  isPoker
                    ? openPokerVariantPicker
                    : isSolitaire
                      ? openSolitaireVariantPicker
                      : isRummy
                        ? openRummyVariantPicker
                        : undefined
                }
              >
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
                  {/* Placeholder visual */}
                  <View
                    style={[
                      styles.cardVisual,
                      { borderColor: item.accent + "55", overflow: "hidden" },
                    ]}
                  >
                    <ImageBackground
                      source={item.image}
                      resizeMode="contain"
                      style={styles.cardVisualImage}
                    />
                  </View>

                  {/* Footer: player count + tag */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPlayers}>{item.players}</Text>
                    <View
                      style={[styles.cardTag, { borderColor: item.accent }]}
                    >
                      <Text
                        style={[styles.cardTagText, { color: item.accent }]}
                      >
                        {item.tag}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* ── Dot indicators ── */}
        <View style={styles.dotsRow}>
          {CAROUSEL_GAMES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Play button */}
        <View style={{ paddingHorizontal: padH }}>
          <TouchableOpacity
            style={[
              styles.playBtn,
              { paddingVertical: isSmallScreen ? 16 : 18 },
            ]}
            onPress={handlePlay}
          >
            <Text
              style={[styles.playBtnText, { fontSize: playButtonTextSize }]}
            >
              {playButtonLabel}
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    color: "#b0b0c0",
    fontSize: 15,
    marginTop: 12,
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
    borderStyle: "solid",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardVisualText: {
    color: "#555",
    fontSize: 12,
  },
  cardVisualImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  cardImageOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
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
    paddingVertical: 8,
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
    marginTop: 0,
  },
  playBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

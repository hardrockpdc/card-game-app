import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Image } from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { useHasSave } from "../game/useResumePrompt";
import { clearGame } from "../game/gameSaves";
import { confirmStartNew } from "../components/GameSetupLayout";
import { scale, scaleFont } from "../game/responsive";

// ─── Game data ────────────────────────────────────────────────────────────────

const GAMES = [
  {
    id: "blackjack",
    label: "Blackjack",
    tag: "Classic",
    accent: "#2e7d32",
    image: require("../assets/images/thumb_blackjack.jpg"),
  },
  {
    id: "solitaire",
    label: "Solitaire",
    tag: "5 modes",
    accent: "#7fb3ff",
    image: require("../assets/images/thumb_solitaire.jpg"),
  },
  {
    id: "rummy",
    label: "Rummy",
    tag: "3 variants",
    accent: "#e94560",
    image: require("../assets/images/thumb_rummy.jpg"),
  },
  {
    id: "conquian",
    label: "Conquián",
    tag: "Mexican",
    accent: "#c4923f",
    image: require("../assets/images/thumb_conquian.jpg"),
  },
  {
    id: "goFish",
    label: "Go Fish",
    tag: "Family",
    accent: "#1565c0",
    image: require("../assets/images/thumb_gofish.jpg"),
  },
  {
    id: "poker",
    label: "Poker",
    tag: "3 variants",
    accent: "#6a1b9a",
    image: require("../assets/images/thumb_poker.jpg"),
  },
  {
    id: "lastCard",
    label: "Last Card",
    tag: "UNO-style",
    accent: "#e94560",
    image: require("../assets/images/thumb_lastcard.jpg"),
  },
];

const BLACKJACK_SAVE_KEY = "@cardnight:save:blackjack";
const DEFAULT_POKER_VARIANT = "texasHoldem";
const DEFAULT_RUMMY_VARIANT = "ginRummy";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SinglePlayerSetupScreen({ navigation }) {
  const [selectedId, setSelectedId] = useState(null); // for blackjack resume dialog

  const hasBlackjackSave = useHasSave(BLACKJACK_SAVE_KEY);

  // ─── Navigation handlers ──────────────────────────────────────────────────

  function handleGamePress(game) {
    switch (game.id) {
      case "blackjack":
        if (hasBlackjackSave) {
          setSelectedId("blackjack");
        } else {
          navigation.navigate("Game", { resumeFromSave: false });
        }
        return;
      case "solitaire":
        navigation.navigate("SolitaireVariantPicker");
        return;
      case "rummy":
        navigation.navigate("RummyVariantPicker", {
          mode: "singleplayer",
          currentVariant: DEFAULT_RUMMY_VARIANT,
        });
        return;
      case "conquian":
        navigation.navigate("ConquianSetup", { mode: "singleplayer" });
        return;
      case "goFish":
        navigation.navigate("GoFishPicker");
        return;
      case "poker":
        navigation.navigate("PokerVariantPicker", {
          mode: "singleplayer",
          currentVariant: DEFAULT_POKER_VARIANT,
        });
        return;
      case "lastCard":
        navigation.navigate("GameSetup", {
          mode: "singleplayer",
          gameId: "lastCard",
          gameName: "Last Card",
          screenName: "LastCardGame",
          aiRange: [1, 7],
          hasDifficulty: true,
        });
        return;
      default:
        navigation.navigate("Game");
    }
  }

  const blackjackResume = () => {
    setSelectedId(null);
    navigation.navigate("Game", { resumeFromSave: true });
  };
  const blackjackStartNew = async () => {
    setSelectedId(null);
    await clearGame(BLACKJACK_SAVE_KEY);
    navigation.navigate("Game", { resumeFromSave: false });
  };

  // ─── Layout ───────────────────────────────────────────────────────────────

  const COLS = 2;
  const GAP = scale(12);
  // Heights come from flex (each row gets an equal slice of available space),
  // so all 7 tiles always fit on screen regardless of nav header / safe area.

  // Split into rows of 2; last row centred if odd
  const rows = [];
  for (let i = 0; i < GAMES.length; i += COLS) {
    rows.push(GAMES.slice(i, i + COLS));
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Blackjack resume dialog */}
      {selectedId === "blackjack" && (
        <View style={styles.resumeOverlay}>
          <View style={styles.resumeCard}>
            <Text style={styles.resumeTitle}>Blackjack</Text>
            <Text style={styles.resumeBody}>You have a saved game.</Text>
            <TouchableOpacity style={styles.resumeBtn} onPress={blackjackResume}>
              <Text style={styles.resumeBtnText}>Continue Game</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resumeBtnSecondary}
              onPress={() => confirmStartNew(blackjackStartNew)}
            >
              <Text style={styles.resumeBtnSecondaryText}>Start New Game</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resumeCancel}
              onPress={() => setSelectedId(null)}
            >
              <Text style={styles.resumeCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[
                styles.row,
                rowIdx < rows.length - 1 && { marginBottom: GAP },
              ]}
            >
              {row.map((game, colIdx) => (
                <TouchableOpacity
                  key={game.id}
                  style={[
                    styles.tile,
                    {
                      borderColor: game.accent + "66",
                      marginLeft: colIdx > 0 ? GAP : 0,
                    },
                    // Odd last tile: don't stretch full width, keep it half-width
                    row.length < COLS && styles.tileHalf,
                  ]}
                  onPress={() => handleGamePress(game)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={game.image}
                    style={styles.tileImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  container: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(8),
  },
  grid: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  tile: {
    flex: 1,
    backgroundColor: "#0d1424",
    borderRadius: scale(14),
    borderWidth: 1.5,
    overflow: "hidden",
  },
  // Odd final tile: take only one column's worth of width (left-aligned)
  tileHalf: {
    flex: 0,
    width: "50%",
  },
  tileImage: {
    flex: 1,
    width: "100%",
  },
  // ── Blackjack resume overlay ───────────────────────────────────────────────
  resumeOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  resumeCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(16),
    padding: scale(24),
    width: "80%",
    alignItems: "center",
    gap: scale(12),
  },
  resumeTitle: {
    color: "#ffffff",
    fontSize: scaleFont(20),
    fontWeight: "800",
  },
  resumeBody: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    textAlign: "center",
  },
  resumeBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    width: "100%",
    alignItems: "center",
  },
  resumeBtnText: {
    color: "#fff",
    fontSize: scaleFont(16),
    fontWeight: "700",
  },
  resumeBtnSecondary: {
    borderWidth: 1.5,
    borderColor: "#334",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    width: "100%",
    alignItems: "center",
  },
  resumeBtnSecondaryText: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
  resumeCancel: {
    paddingVertical: scale(6),
  },
  resumeCancelText: {
    color: "#555",
    fontSize: scaleFont(14),
  },
});

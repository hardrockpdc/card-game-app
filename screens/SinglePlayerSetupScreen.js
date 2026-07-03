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
    tag: "Color match",
    accent: "#e94560",
    image: require("../assets/images/thumb_lastcard.jpg"),
  },
];

// Decorative background grid line positions (percent of screen w/h)
const VLINES = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];
const HLINES = [10, 20, 30, 40, 50, 60, 70, 80, 90];

const BLACKJACK_SAVE_KEY = "@cardnight:save:blackjack";
const DEFAULT_POKER_VARIANT = "texasHoldem";
const DEFAULT_RUMMY_VARIANT = "ginRummy";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SinglePlayerSetupScreen({ navigation }) {
  const [selectedId, setSelectedId] = useState(null); // for blackjack resume dialog
  const [pendingGame, setPendingGame] = useState(null); // "Play this game?" confirm

  const hasBlackjackSave = useHasSave(BLACKJACK_SAVE_KEY);

  // ─── Navigation handlers ──────────────────────────────────────────────────

  // A tap opens a confirm step first (guards against accidental taps while
  // swiping the grid). Blackjack-with-a-save skips straight to its own resume
  // dialog, which already offers a Cancel.
  function onTilePress(game) {
    if (game.id === "blackjack" && hasBlackjackSave) {
      setSelectedId("blackjack");
      return;
    }
    setPendingGame(game);
  }

  function confirmPendingPlay() {
    const game = pendingGame;
    setPendingGame(null);
    if (game) handleGamePress(game);
  }

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

  // 7 games + a "Coming Soon" placeholder = 8 tiles, 4 even rows of 2
  const gridItems = [...GAMES, { id: "comingSoon", comingSoon: true }];
  const rows = [];
  for (let i = 0; i < gridItems.length; i += COLS) {
    rows.push(gridItems.slice(i, i + COLS));
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Subtle grid texture so the background isn't plain. Sits behind the
          tiles; purely decorative (not touchable / not read by a11y). */}
      <View style={styles.gridBg} pointerEvents="none">
        {VLINES.map((left) => (
          <View key={`v${left}`} style={[styles.vLine, { left: `${left}%` }]} />
        ))}
        {HLINES.map((top) => (
          <View key={`h${top}`} style={[styles.hLine, { top: `${top}%` }]} />
        ))}
      </View>

      {/* "Play this game?" confirm — guards accidental taps while swiping */}
      {pendingGame && (
        <View style={styles.resumeOverlay}>
          <View style={styles.resumeCard}>
            <Image
              source={pendingGame.image}
              style={styles.confirmThumb}
              resizeMode="cover"
            />
            <Text style={styles.resumeTitle}>{pendingGame.label}</Text>
            <Text style={styles.resumeBody}>Ready to play?</Text>
            <TouchableOpacity
              style={[styles.resumeBtn, { backgroundColor: pendingGame.accent }]}
              onPress={confirmPendingPlay}
            >
              <Text style={styles.resumeBtnText}>Play</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resumeCancel}
              onPress={() => setPendingGame(null)}
            >
              <Text style={styles.resumeCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
              {row.map((game, colIdx) =>
                game.comingSoon ? (
                  <View
                    key="comingSoon"
                    style={[
                      styles.cell,
                      { marginLeft: colIdx > 0 ? GAP : 0 },
                    ]}
                  >
                    <View style={[styles.tile, styles.comingSoonTile]}>
                      <Text style={styles.comingSoonText}>Coming{"\n"}Soon</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    key={game.id}
                    style={[
                      styles.cell,
                      { marginLeft: colIdx > 0 ? GAP : 0 },
                    ]}
                    onPress={() => onTilePress(game)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={game.image}
                      style={[
                        styles.tile,
                        {
                          borderColor:
                            pendingGame?.id === game.id
                              ? game.accent
                              : game.accent + "66",
                          borderWidth: pendingGame?.id === game.id ? 3 : 1.5,
                        },
                      ]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ),
              )}
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
  gridBg: {
    ...StyleSheet.absoluteFillObject,
  },
  vLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  hLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.05)",
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
  // Each grid cell fills its share of the row and centers the artwork
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // The bordered tile is sized to the thumbnail's 3:4 ratio so the border
  // hugs the artwork (no letterbox gap). Bound by the cell on whichever
  // dimension is the constraint.
  tile: {
    height: "100%",
    maxWidth: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#0d1424",
    borderRadius: scale(14),
    borderWidth: 1.5,
    overflow: "hidden",
  },
  comingSoonTile: {
    borderColor: "#33405566",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonText: {
    color: "#5a6b85",
    fontSize: scaleFont(15),
    fontWeight: "700",
    textAlign: "center",
    lineHeight: scaleFont(20),
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
  confirmThumb: {
    width: scale(96),
    aspectRatio: 3 / 4,
    borderRadius: scale(10),
    marginBottom: scale(4),
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

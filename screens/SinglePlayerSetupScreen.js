import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import { useHasSave } from "../game/useResumePrompt";
import { clearGame } from "../game/gameSaves";
import { confirmStartNew } from "../components/GameSetupLayout";
import { scale, scaleFont } from "../game/responsive";

// ─── Game data ────────────────────────────────────────────────────────────────

// Flat, consistent tiles: each game gets one accent colour + a suit motif +
// its name. No photo/AI art — a deliberate design system so the set reads as
// "designed", not generated.
const GAMES = [
  { id: "blackjack", label: "Blackjack", tag: "Classic", accent: "#3ea662", suit: "♠" },
  { id: "solitaire", label: "Solitaire", tag: "5 modes", accent: "#5b9bd5", suit: "♦" },
  { id: "rummy", label: "Rummy", tag: "3 variants", accent: "#e05068", suit: "♥" },
  { id: "conquian", label: "Conquián", tag: "Mexican", accent: "#d3a24a", suit: "♣" },
  { id: "goFish", label: "Go Fish", tag: "Family", accent: "#2aa6bf", suit: "♥" },
  { id: "poker", label: "Poker", tag: "3 variants", accent: "#9a5cd0", suit: "♠" },
  { id: "lastCard", label: "Last Card", tag: "Color match", accent: "#e8833a", suit: "♦" },
  { id: "memory", label: "Memory Match", tag: "Find pairs", accent: "#8a7bff", suit: "♣" },
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
  const [gridSize, setGridSize] = useState(null); // measured grid area, for tile sizing

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
      case "memory":
        navigation.navigate("MemoryDifficultyPicker");
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

  // 8 games = 8 tiles, 4 even rows of 2
  const rows = [];
  for (let i = 0; i < GAMES.length; i += COLS) {
    rows.push(GAMES.slice(i, i + COLS));
  }

  // Deterministic tile sizing: measure the grid area (onLayout) then compute an
  // exact px size that fits a 3:4 tile in each cell. This replaces a fragile
  // flex + height:"100%" + aspectRatio combo that could collapse on some devices
  // (the Image then fell back to its full pixel size — one giant tile).
  const ROWS = rows.length;
  let tileW = 0;
  let tileH = 0;
  if (gridSize && gridSize.width > 0 && gridSize.height > 0) {
    const cellW = (gridSize.width - GAP * (COLS - 1)) / COLS;
    const cellH = (gridSize.height - GAP * (ROWS - 1)) / ROWS;
    tileW = Math.min(cellW, cellH * (3 / 4)); // bound by tighter dimension
    tileH = tileW * (4 / 3);
  }
  const tileSize = { width: tileW, height: tileH };

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
            <View
              style={[
                styles.confirmThumb,
                styles.flatTile,
                { borderColor: pendingGame.accent, borderWidth: 2 },
              ]}
            >
              <Text
                style={[styles.confirmThumbSuit, { color: pendingGame.accent }]}
              >
                {pendingGame.suit}
              </Text>
              <Text
                style={[
                  styles.tilePip,
                  styles.tilePipTL,
                  { color: pendingGame.accent, fontSize: scaleFont(13) },
                ]}
              >
                {pendingGame.suit}
              </Text>
              <Text
                style={[
                  styles.tilePip,
                  styles.tilePipBR,
                  { color: pendingGame.accent, fontSize: scaleFont(13) },
                ]}
              >
                {pendingGame.suit}
              </Text>
            </View>
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
        <View
          style={styles.grid}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setGridSize((prev) =>
              prev && prev.width === width && prev.height === height
                ? prev
                : { width, height },
            );
          }}
        >
          {rows.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[
                styles.row,
                { height: tileH },
                rowIdx < rows.length - 1 && { marginBottom: GAP },
              ]}
            >
              {row.map((game, colIdx) => (
                  <TouchableOpacity
                    key={game.id}
                    style={[
                      styles.cell,
                      { marginLeft: colIdx > 0 ? GAP : 0 },
                    ]}
                    onPress={() => onTilePress(game)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.tile,
                        styles.flatTile,
                        tileSize,
                        {
                          borderColor: game.accent,
                          borderWidth: pendingGame?.id === game.id ? 3 : 2,
                        },
                      ]}
                    >
                      {/* Soft accent halo bleeding off the top edge (clipped by
                          the tile's rounded corners) — colour identity without art. */}
                      <View
                        pointerEvents="none"
                        style={[
                          styles.tileGlow,
                          {
                            backgroundColor: game.accent,
                            width: tileW * 1.3,
                            height: tileW * 1.3,
                            borderRadius: (tileW * 1.3) / 2,
                            top: -tileW * 0.65,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.flatTileSuit,
                          {
                            color: game.accent,
                            fontSize: Math.max(44, Math.round(tileH * 0.5)),
                          },
                        ]}
                      >
                        {game.suit}
                      </Text>
                      {/* Corner pips, like a real playing card */}
                      <Text
                        style={[
                          styles.tilePip,
                          styles.tilePipTL,
                          {
                            color: game.accent,
                            fontSize: Math.max(13, Math.round(tileH * 0.1)),
                          },
                        ]}
                      >
                        {game.suit}
                      </Text>
                      <Text
                        style={[
                          styles.tilePip,
                          styles.tilePipBR,
                          {
                            color: game.accent,
                            fontSize: Math.max(13, Math.round(tileH * 0.1)),
                          },
                        ]}
                      >
                        {game.suit}
                      </Text>
                      <View style={styles.flatTileContent}>
                        <Text
                          style={styles.flatTileName}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                        >
                          {game.label}
                        </Text>
                      </View>
                    </View>
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
    justifyContent: "center", // absorb any vertical slack (tiles are fixed-size)
  },
  row: {
    flexDirection: "row",
  },
  // Each grid cell fills its share of the row and centers the artwork
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // The bordered tile. Its width/height are supplied at render time (computed
  // from the measured grid area) so it can never collapse to the image's
  // intrinsic size. 3:4 ratio is enforced by that computation, not aspectRatio.
  tile: {
    backgroundColor: "#0d1424",
    borderRadius: scale(14),
    borderWidth: 1.5,
    overflow: "hidden",
  },
  // ── Flat game tiles ────────────────────────────────────────────────────────
  flatTile: {
    backgroundColor: "#141a2e",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  flatTileSuit: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: "center",
    textAlignVertical: "center",
    fontWeight: "900",
    opacity: 0.2,
  },
  // Soft accent halo at the top of a tile (absolute circle, clipped by the
  // tile's overflow:hidden + rounded corners).
  tileGlow: {
    position: "absolute",
    alignSelf: "center",
    opacity: 0.13,
  },
  // Corner pips, like the rank corners of a real playing card.
  tilePip: {
    position: "absolute",
    fontWeight: "900",
  },
  tilePipTL: {
    top: scale(8),
    left: scale(10),
  },
  tilePipBR: {
    bottom: scale(8),
    right: scale(10),
    transform: [{ rotate: "180deg" }],
  },
  flatTileContent: {
    alignItems: "center",
    paddingHorizontal: scale(6),
  },
  flatTileName: {
    color: "#ffffff",
    fontSize: scaleFont(17),
    fontWeight: "800",
    textAlign: "center",
  },
  flatTileTag: {
    fontSize: scaleFont(10),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: scale(4),
    textAlign: "center",
  },
  confirmThumbSuit: {
    fontSize: scaleFont(46),
    fontWeight: "900",
    opacity: 0.25,
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
    // Explicit width AND height (3:4) — not aspectRatio, which RN's Image can
    // ignore in favor of the source's intrinsic (huge) size.
    width: scale(96),
    height: scale(128),
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

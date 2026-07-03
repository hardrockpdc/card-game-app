import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import Card from "../components/Card";
import { DIFFICULTIES, createGame, flip, clearMismatch } from "../game/memory";
import { addCoins } from "../game/wallet";
import { getWinReward } from "../game/rewards";
import { recordWin } from "../game/profile";
import { hapticWin, hapticSelection } from "../game/haptics";
import { scale, scaleFont } from "../game/responsive";

// Card component base size (from components/Card.js): 70×100 at factor 1, plus a
// small margin. We size cards to fit the measured grid using these constants.
const CARD_BASE_W = 78; // 70 + margin
const CARD_BASE_H = 108; // 100 + margin
const MISMATCH_DELAY = 850; // ms a mismatched pair stays visible before flipping back

export default function MemoryGameScreen({ navigation, route }) {
  const { width } = useWindowDimensions();

  // Difficulty is chosen on the picker screen before we get here.
  const difficulty = route?.params?.difficulty || "medium";

  const [game, setGame] = useState(() => createGame(difficulty));
  const [gridSize, setGridSize] = useState(null); // measured play area
  const [coinsEarned, setCoinsEarned] = useState(0);

  const mismatchTimer = useRef(null);
  const coinRewarded = useRef(false);

  // Award coins once when the board is cleared.
  useEffect(() => {
    if (game.status === "won" && !coinRewarded.current) {
      coinRewarded.current = true;
      const reward = getWinReward("memory", false);
      addCoins(reward).then(() => setCoinsEarned(reward));
      recordWin("memory");
      hapticWin();
    }
  }, [game.status]);

  // Clear any pending flip-back timer when we leave the screen.
  useEffect(() => {
    return () => {
      if (mismatchTimer.current) clearTimeout(mismatchTimer.current);
    };
  }, []);

  // Re-deal a fresh board at the same difficulty (used by "Play Again").
  function restart() {
    if (mismatchTimer.current) {
      clearTimeout(mismatchTimer.current);
      mismatchTimer.current = null;
    }
    coinRewarded.current = false;
    setCoinsEarned(0);
    setGame(createGame(difficulty));
  }

  function onCardPress(index) {
    const next = flip(game, index);
    if (next === game) return; // illegal tap — no change
    hapticSelection();
    setGame(next);

    // A mismatch locks the board; flip the pair back down after a short look.
    if (next.locked) {
      mismatchTimer.current = setTimeout(() => {
        setGame((g) => clearMismatch(g));
        mismatchTimer.current = null;
      }, MISMATCH_DELAY);
    }
  }

  // ── Tile sizing (deterministic — measure the play area, size in px) ──────────
  const factor = Math.min(Math.max(width / 390, 0.85), 1.5);
  const GAP = scale(6);
  const { cols, rows } = game;
  let sizeScale = 0;
  let cellW = 0;
  let cellH = 0;
  if (gridSize && gridSize.width > 0 && gridSize.height > 0) {
    cellW = (gridSize.width - GAP * (cols - 1)) / cols;
    cellH = (gridSize.height - GAP * (rows - 1)) / rows;
    sizeScale = Math.min(
      cellW / (CARD_BASE_W * factor),
      cellH / (CARD_BASE_H * factor),
    );
  }

  // Split the flat card list into rows.
  const cardRows = [];
  for (let i = 0; i < game.cards.length; i += cols) {
    cardRows.push(game.cards.slice(i, i + cols));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Header: difficulty label + progress (no tappable controls here so a
          stray tap during play can't restart the game) */}
      <View style={styles.header}>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>Moves: {game.moves}</Text>
          <Text style={styles.difficultyLabel}>{DIFFICULTIES[difficulty].label}</Text>
          <Text style={styles.statText}>
            Pairs: {game.matched}/{game.pairs}
          </Text>
        </View>
      </View>

      {/* Play area */}
      <View
        style={styles.gridArea}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setGridSize((prev) =>
            prev && prev.width === w && prev.height === h ? prev : { width: w, height: h },
          );
        }}
      >
        {sizeScale > 0 && (
          <View style={styles.grid}>
            {cardRows.map((row, rowIdx) => (
              <View
                key={rowIdx}
                style={[
                  styles.row,
                  { height: cellH, marginBottom: rowIdx < cardRows.length - 1 ? GAP : 0 },
                ]}
              >
                {row.map((card, colIdx) => {
                  const index = rowIdx * cols + colIdx;
                  const faceDown = !(card.faceUp || card.matched);
                  return (
                    <View
                      key={card.id}
                      style={[styles.cell, { width: cellW, marginLeft: colIdx > 0 ? GAP : 0 }]}
                    >
                      <TouchableOpacity
                        onPress={() => onCardPress(index)}
                        disabled={card.matched || game.locked || game.status === "won"}
                        activeOpacity={0.85}
                        style={card.matched && styles.matchedCard}
                        accessibilityRole="button"
                        accessibilityLabel={faceDown ? "Face down card" : `${card.rank} of ${card.suit}`}
                      >
                        <Card
                          rank={card.rank}
                          suit={card.suit}
                          faceDown={faceDown}
                          sizeScale={sizeScale}
                          animateReveal
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Win overlay */}
      {game.status === "won" && (
        <View style={styles.overlay}>
          <View style={styles.winCard}>
            <Text style={styles.winTitle}>You Win! 🎉</Text>
            <Text style={styles.winBody}>
              Cleared {game.pairs} pairs in {game.moves} moves.
            </Text>
            {coinsEarned > 0 && (
              <Text style={styles.winCoins}>+{coinsEarned.toLocaleString()} 🪙</Text>
            )}
            <TouchableOpacity style={styles.winBtn} onPress={restart}>
              <Text style={styles.winBtnText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.winBtnSecondary}
              onPress={() => navigation.navigate("SinglePlayerSetup")}
            >
              <Text style={styles.winBtnSecondaryText}>Back to Games</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    paddingHorizontal: scale(16),
    paddingTop: scale(10),
    paddingBottom: scale(6),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(4),
  },
  statText: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    fontWeight: "600",
  },
  difficultyLabel: {
    color: "#7fb3ff",
    fontSize: scaleFont(15),
    fontWeight: "800",
  },
  gridArea: {
    flex: 1,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  grid: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  matchedCard: {
    opacity: 0.4,
  },
  // ── Win overlay ──────────────────────────────────────────────────────────────
  overlay: {
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
  winCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(16),
    padding: scale(24),
    width: "80%",
    alignItems: "center",
    gap: scale(12),
  },
  winTitle: {
    color: "#ffffff",
    fontSize: scaleFont(24),
    fontWeight: "800",
  },
  winBody: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    textAlign: "center",
  },
  winCoins: {
    color: "#ffd700",
    fontSize: scaleFont(20),
    fontWeight: "800",
  },
  winBtn: {
    backgroundColor: "#2e9e54",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    width: "100%",
    alignItems: "center",
  },
  winBtnText: {
    color: "#fff",
    fontSize: scaleFont(16),
    fontWeight: "700",
  },
  winBtnSecondary: {
    borderWidth: 1.5,
    borderColor: "#334",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    width: "100%",
    alignItems: "center",
  },
  winBtnSecondaryText: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
});

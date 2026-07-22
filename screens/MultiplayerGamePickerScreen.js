import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import * as Network from "expo-network";
import { loadProfile, getDisplayName } from "../game/profile";
import { createRoom } from "../game/onlineRoom";
import { scale, scaleFont } from "../game/responsive";

const COLS = 2;
const GAP = scale(12);

// Flat, consistent tiles: each game gets one accent colour + a suit motif +
// its name — the same design system as the single-player Choose Game screen
// (accents/suits match there exactly so the two screens read as one set).
// Who Am I? isn't a card game (a masked party game), so it keeps its 🎭 motif
// instead of a suit and drops the corner pips.
// Solitaire and Blackjack are single-player only, so they're absent here.
const GAMES = [
  { id: "goFish", label: "Go Fish", accent: "#2aa6bf", suit: "♥" },
  { id: "conquian", label: "Conquián", accent: "#d3a24a", suit: "♣" },
  { id: "poker", label: "Poker", accent: "#9a5cd0", suit: "♠" },
  { id: "rummy", label: "Rummy", accent: "#e05068", suit: "♥" },
  { id: "lastCard", label: "Last Card", accent: "#e8833a", suit: "♦" },
  { id: "whoami", label: "Who Am I?", accent: "#3a9d4e", emoji: "🎭" },
];

// Decorative background grid
const VLINES = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];
const HLINES = [10, 20, 30, 40, 50, 60, 70, 80, 90];

const DEFAULT_POKER_VARIANT = "texasHoldem";
const DEFAULT_RUMMY_VARIANT = "ginRummy";

export default function MultiplayerGamePickerScreen({ navigation, route }) {
  // mode "local" (default) = same-WiFi TCP play; "online" = Firebase rooms.
  const isOnline = route?.params?.mode === "online";

  const [hostName, setHostName] = useState(null);
  const [hostIp, setHostIp] = useState(null);
  const [creating, setCreating] = useState(false);
  const [gridSize, setGridSize] = useState(null); // measured grid area, for tile sizing

  useEffect(() => {
    loadProfile().then((p) => setHostName(getDisplayName(p)));
    // Online play doesn't need the local IP, but it's cheap to fetch and keeps
    // the local path unchanged.
    Network.getIpAddressAsync().then(setHostIp);
  }, []);

  function navigateToLobby(params) {
    navigation.navigate("Lobby", {
      role: "host",
      hostName: hostName || "Host",
      hostIp: hostIp || null,
      ...params,
    });
  }

  // Online: create a Firebase room for the chosen game, then open the online
  // lobby. Variant selection for online is a follow-up; defaults for now.
  async function hostOnline({ gameId, variant = null, tone = null }) {
    if (creating) return;
    setCreating(true);
    const result = await createRoom({
      gameId,
      variant,
      tone,
      hostName: hostName || "Host",
    });
    setCreating(false);
    if (!result) {
      Alert.alert("Couldn't create room", "Please check your connection and try again.");
      return;
    }
    navigation.replace("OnlineLobby", {
      code: result.code,
      isHost: true,
      myName: hostName || "Host",
    });
  }

  function handleGamePress(game) {
    if (!hostName || (!isOnline && !hostIp)) {
      // Still loading — shouldn't happen in practice (fetch is fast)
      return;
    }

    if (isOnline) {
      const variant =
        game.id === "poker"
          ? DEFAULT_POKER_VARIANT
          : game.id === "rummy"
            ? DEFAULT_RUMMY_VARIANT
            : null;
      hostOnline({ gameId: game.id, variant });
      return;
    }

    switch (game.id) {
      case "goFish":
        navigateToLobby({ gameId: "goFish" });
        break;
      case "conquian":
        navigateToLobby({ gameId: "conquian" });
        break;
      case "lastCard":
        navigateToLobby({ gameId: "lastCard" });
        break;
      case "whoami":
        navigateToLobby({ gameId: "whoami" });
        break;
      case "poker":
        navigation.navigate("PokerVariantPicker", {
          mode: "lobby",
          currentVariant: DEFAULT_POKER_VARIANT,
          launchParams: {
            role: "host",
            hostName: hostName || "Host",
            hostIp: hostIp || null,
          },
        });
        break;
      case "rummy":
        navigation.navigate("RummyVariantPicker", {
          mode: "lobby",
          currentVariant: DEFAULT_RUMMY_VARIANT,
          launchParams: {
            role: "host",
            hostName: hostName || "Host",
            hostIp: hostIp || null,
          },
        });
        break;
    }
  }

  const rows = [];
  for (let i = 0; i < GAMES.length; i += COLS) {
    rows.push(GAMES.slice(i, i + COLS));
  }

  // Deterministic tile sizing: measure the grid area (onLayout) then compute an
  // exact px size that fits a 3:4 tile in each cell. Matches the single-player
  // screen; guards against the flex + aspectRatio collapse that plagued it.
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

  const loading = !hostName || (!isOnline && !hostIp) || creating;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Decorative background grid */}
      <View style={styles.gridBg} pointerEvents="none">
        {VLINES.map((left) => (
          <View key={`v${left}`} style={[styles.vLine, { left: `${left}%` }]} />
        ))}
        {HLINES.map((top) => (
          <View key={`h${top}`} style={[styles.hLine, { top: `${top}%` }]} />
        ))}
      </View>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#7fb3ff" size="small" />
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
              {row.map((game, colIdx) => {
                const motif = game.suit || game.emoji;
                return (
                  <TouchableOpacity
                    key={game.id}
                    style={[styles.cell, { marginLeft: colIdx > 0 ? GAP : 0 }]}
                    onPress={() => handleGamePress(game)}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.tile,
                        styles.flatTile,
                        tileSize,
                        { borderColor: game.accent, borderWidth: 2 },
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
                            color: game.suit ? game.accent : undefined,
                            fontSize: Math.max(44, Math.round(tileH * 0.5)),
                          },
                        ]}
                      >
                        {motif}
                      </Text>
                      {/* Corner pips, like a real playing card — cards only */}
                      {game.suit && (
                        <>
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
                        </>
                      )}
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
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

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
  loadingOverlay: {
    position: "absolute",
    top: scale(12),
    right: scale(16),
    zIndex: 10,
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
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // The bordered tile. Its width/height are supplied at render time (computed
  // from the measured grid area) so it can never collapse. 3:4 ratio is
  // enforced by that computation, not aspectRatio.
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
});

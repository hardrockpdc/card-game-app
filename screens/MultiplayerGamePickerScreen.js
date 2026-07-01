import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import * as Network from "expo-network";
import { loadProfile, getDisplayName } from "../game/profile";
import { createRoom } from "../game/onlineRoom";
import { scale, scaleFont } from "../game/responsive";

const COLS = 2;
const GAP = scale(12);

// Multiplayer-capable games. Solitaire and Blackjack are single-player only.
const GAMES = [
  {
    id: "goFish",
    label: "Go Fish",
    accent: "#1565c0",
    image: require("../assets/images/thumb_gofish.jpg"),
  },
  {
    id: "conquian",
    label: "Conquián",
    accent: "#c4923f",
    image: require("../assets/images/thumb_conquian.jpg"),
  },
  {
    id: "poker",
    label: "Poker",
    accent: "#6a1b9a",
    image: require("../assets/images/thumb_poker.jpg"),
  },
  {
    id: "rummy",
    label: "Rummy",
    accent: "#e94560",
    image: require("../assets/images/thumb_rummy.jpg"),
  },
  {
    id: "lastCard",
    label: "Last Card",
    accent: "#e94560",
    image: require("../assets/images/thumb_lastcard.jpg"),
  },
  {
    id: "whoami",
    label: "Who Am I?",
    accent: "#2e7d32",
    emoji: "🎭",
    emojiColor: "#0a2010",
  },
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

  // 7 games + 1 "more coming" = 4 even rows
  const gridItems = [...GAMES];
  const rows = [];
  for (let i = 0; i < gridItems.length; i += COLS) {
    rows.push(gridItems.slice(i, i + COLS));
  }

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
                    style={[styles.cell, { marginLeft: colIdx > 0 ? GAP : 0 }]}
                  >
                    <View style={[styles.tile, styles.comingSoonTile]}>
                      <Text style={styles.comingSoonText}>Coming{"\n"}Soon</Text>
                    </View>
                  </View>
                ) : game.emoji ? (
                  // Emoji placeholder tile (no thumbnail image)
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
                        styles.emojiTile,
                        {
                          backgroundColor: game.emojiColor,
                          borderColor: game.accent + "66",
                        },
                      ]}
                    >
                      <Text style={styles.emojiIcon}>{game.emoji}</Text>
                      <Text style={[styles.emojiLabel, { color: game.accent }]}>
                        {game.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    key={game.id}
                    style={[styles.cell, { marginLeft: colIdx > 0 ? GAP : 0 }]}
                    onPress={() => handleGamePress(game)}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    <Image
                      source={game.image}
                      style={[styles.tile, { borderColor: game.accent + "66" }]}
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
    padding: GAP,
  },
  grid: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    flex: 1,
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: scale(12),
    borderWidth: 1.5,
    overflow: "hidden",
  },
  emojiTile: {
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  emojiIcon: {
    fontSize: scaleFont(52),
  },
  emojiLabel: {
    fontSize: scaleFont(14),
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  comingSoonTile: {
    backgroundColor: "#16213e",
    borderStyle: "dashed",
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonText: {
    color: "#5a6b85",
    fontSize: scaleFont(13),
    fontWeight: "600",
    textAlign: "center",
    lineHeight: scaleFont(20),
  },
});

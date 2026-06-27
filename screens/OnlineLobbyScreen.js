import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { HapticTouchable as TouchableOpacity } from "../components/Haptic";
import * as Clipboard from "expo-clipboard";
import { scale, scaleFont } from "../game/responsive";
import { getUid } from "../game/firebase";
import {
  subscribeToRoom,
  leaveRoom,
  startRoomGame,
} from "../game/onlineRoom";
import { setNetworkMode } from "../game/GameNetwork";

// Per-game labels + player limits for the online lobby. `screen` is set only on
// games whose online gameplay is wired up; others can still gather in a lobby
// but Start shows a "coming soon" note (pilot: Go Fish first).
const GAME_INFO = {
  goFish: { label: "Go Fish", min: 2, max: 4, screen: "GoFishGame" },
  conquian: { label: "Conquián", min: 2, max: 4 },
  poker: { label: "Poker", min: 2, max: 5 },
  rummy: { label: "Rummy", min: 2, max: 4 },
  wildRound: { label: "Wild Round", min: 3, max: 8 },
  lastCard: { label: "Last Card", min: 2, max: 8 },
  whoami: { label: "Who Am I?", min: 3, max: 8 },
};

// Convert the players object (keyed by uid) into a stable, sorted array.
function toPlayerArray(playersObj, myUid) {
  if (!playersObj) return [];
  return Object.entries(playersObj)
    .map(([uid, p]) => ({
      uid,
      name: p.name,
      isHost: !!p.isHost,
      isMe: uid === myUid,
      joinedAt: p.joinedAt || 0,
    }))
    .sort((a, b) => {
      // Host always first, then join order.
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      return (a.joinedAt || 0) - (b.joinedAt || 0);
    });
}

export default function OnlineLobbyScreen({ navigation, route }) {
  const { code, isHost, myName } = route.params || {};
  const myUid = getUid();

  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);
  const leftRef = useRef(false); // guard so leave-on-unmount doesn't double-fire
  const launchedRef = useRef(false); // guard so we navigate into the game once

  // Subscribe to live room updates.
  useEffect(() => {
    const unsubscribe = subscribeToRoom(code, (data) => {
      if (data === null) {
        // Room was deleted (host left / closed).
        if (!leftRef.current && !isHost) {
          leftRef.current = true;
          Alert.alert("Room Closed", "The host ended the room.", [
            { text: "OK", onPress: () => navigation.navigate("Home") },
          ]);
        }
        return;
      }
      setRoom(data);

      // Clients advance into the game when the host flips status to "playing".
      // (The host navigates itself in handleStart, so it skips this.)
      if (
        data.status === "playing" &&
        !isHost &&
        !leftRef.current &&
        !launchedRef.current &&
        data.gameScreen &&
        data.gamePlayers
      ) {
        launchedRef.current = true;
        setNetworkMode("online", { code, uid: myUid, isHost: false });
        navigation.replace(data.gameScreen, {
          role: "client",
          myName,
          players: data.gamePlayers,
          assignedClientId: myUid,
        });
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [code]);

  // Leave the room when the user backs out (hardware back).
  useEffect(() => {
    const onBack = () => {
      Alert.alert(
        "Leave Room?",
        isHost
          ? "You'll close the room and disconnect everyone."
          : "You'll leave this room.",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Leave",
            style: "destructive",
            onPress: () => {
              leftRef.current = true;
              leaveRoom(code, { isHost });
              navigation.navigate("Home");
            },
          },
        ],
      );
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, [code, isHost, navigation]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function handleCopyCode() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  function handleStart() {
    const info = GAME_INFO[room?.gameId] || {};
    const count = players.length;
    if (count < (info.min ?? 2)) {
      Alert.alert(
        "Not enough players",
        `${info.label || "This game"} needs at least ${info.min} players.`,
      );
      return;
    }

    // Games without a wired online screen yet (everything except the Go Fish
    // pilot) just confirm the lobby works.
    if (!info.screen) {
      Alert.alert(
        "Coming soon",
        `Online ${info.label} is on the way. The lobby and player sync work — gameplay is being wired up game by game.`,
      );
      return;
    }

    // Finalize the players array everyone shares. Host is always "host"; each
    // remote player keeps their uid so private hands route correctly.
    const gamePlayers = players.map((p) =>
      p.isHost ? { id: "host", name: p.name } : { id: p.uid, name: p.name },
    );

    setNetworkMode("online", { code, uid: myUid, isHost: true });
    launchedRef.current = true;
    startRoomGame(code, { gameScreen: info.screen, gamePlayers });
    navigation.replace(info.screen, {
      role: "host",
      myName,
      players: gamePlayers,
    });
  }

  const players = toPlayerArray(room?.players, myUid);
  const info = GAME_INFO[room?.gameId] || { label: "Game", min: 2, max: 8 };

  if (!room) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#7fb3ff" size="large" />
        <Text style={styles.loadingText}>Connecting to room…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Online Lobby</Text>

      {/* Room code — big and tappable to copy */}
      <TouchableOpacity
        style={[styles.codeBox, copied && styles.codeBoxCopied]}
        onPress={handleCopyCode}
        activeOpacity={0.75}
      >
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.codeValue}>{code}</Text>
        <Text style={[styles.codeHint, copied && styles.codeHintCopied]}>
          {copied ? "✓ Copied!" : "Tap to copy · share with friends"}
        </Text>
      </TouchableOpacity>

      <View style={styles.gameChip}>
        <Text style={styles.gameChipText}>{info.label}</Text>
      </View>

      <Text style={styles.sectionLabel}>
        Players ({players.length}/{info.max})
      </Text>

      <FlatList
        data={players}
        keyExtractor={(item) => item.uid}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
            <View style={styles.badges}>
              {item.isHost && <Text style={styles.badge}>HOST</Text>}
              {item.isMe && (
                <Text style={[styles.badge, styles.badgeMe]}>YOU</Text>
              )}
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={styles.bottomSection}>
        {isHost ? (
          <>
            <Text style={styles.waitingText}>
              {players.length < info.min
                ? `${info.label} needs at least ${info.min} players`
                : "Ready! Tap Start when everyone's in."}
            </Text>
            <TouchableOpacity
              style={[
                styles.startButton,
                players.length < info.min && styles.startButtonDimmed,
              ]}
              onPress={handleStart}
            >
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.waitingText}>
            Waiting for the host to start the game…
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    padding: scale(20),
    paddingTop: scale(16),
  },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    marginTop: scale(12),
  },
  title: {
    fontSize: scaleFont(26),
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(233,69,96,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
    marginBottom: scale(16),
  },
  codeBox: {
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: "#e94560",
    padding: scale(18),
    alignItems: "center",
    marginBottom: scale(14),
  },
  codeBoxCopied: { borderColor: "#4caf50" },
  codeLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: scale(2),
    marginBottom: scale(4),
  },
  codeValue: {
    color: "#e94560",
    fontSize: scaleFont(48),
    fontWeight: "bold",
    letterSpacing: scale(8),
  },
  codeHint: {
    color: "#9090a8",
    fontSize: scaleFont(12),
    marginTop: scale(4),
  },
  codeHintCopied: { color: "#4caf50", fontWeight: "bold" },
  gameChip: {
    alignSelf: "center",
    backgroundColor: "#16213e",
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#334",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    marginBottom: scale(16),
  },
  gameChipText: {
    color: "#7fb3ff",
    fontSize: scaleFont(15),
    fontWeight: "700",
  },
  sectionLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
    textTransform: "uppercase",
    letterSpacing: scale(1),
    marginBottom: scale(10),
  },
  list: {
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    marginBottom: scale(16),
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
  },
  avatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#e94560",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(14),
  },
  avatarText: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
  },
  playerName: {
    flex: 1,
    color: "#ffffff",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
  badges: { flexDirection: "row", gap: scale(6) },
  badge: {
    backgroundColor: "#2a2a4a",
    color: "#c4c4d4",
    fontSize: scaleFont(10),
    fontWeight: "bold",
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    letterSpacing: scale(0.5),
    overflow: "hidden",
  },
  badgeMe: { backgroundColor: "#1a3a1a", color: "#4caf50" },
  separator: {
    height: 1,
    backgroundColor: "#1a1a2e",
    marginHorizontal: scale(14),
  },
  bottomSection: {
    alignItems: "center",
    paddingBottom: scale(16),
    gap: scale(12),
  },
  waitingText: {
    color: "#c4c4d4",
    fontSize: scaleFont(14),
    textAlign: "center",
  },
  startButton: {
    backgroundColor: "#e94560",
    borderWidth: 1,
    borderColor: "#ff6b81",
    paddingHorizontal: scale(56),
    paddingVertical: scale(16),
    borderRadius: scale(16),
  },
  startButtonDimmed: { opacity: 0.4 },
  startButtonText: {
    color: "#ffffff",
    fontSize: scaleFont(20),
    fontWeight: "bold",
  },
});
